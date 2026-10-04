// Follow Along as a native app: the built web app (../../dist), embedded and served from
// tauri://localhost. That origin holds every reader's IndexedDB and is keyed by `identifier`
// in tauri.conf.json, so the identifier and `useHttpsScheme` never change after a release.

mod links_in;
mod probe;

// A webview has no tabs: a link with target="_blank" goes nowhere, so the page hands it to
// the platform's browser instead. Every link out of the reader is one of those.
const LINKS_OUT: &str = r#"
document.addEventListener('click', (event) => {
  const link = event.target.closest && event.target.closest('a[target="_blank"]')
  if (!link) return
  event.preventDefault()
  window.__TAURI_INTERNALS__.invoke('open_url', { url: link.href })
}, true)
"#;

#[cfg(desktop)]
const COLUMN: f64 = 640.0;

#[tauri::command]
fn open_url(app: tauri::AppHandle, url: tauri::Url) {
    // Feed content is not trusted: only an address a browser opens.
    if !matches!(url.scheme(), "http" | "https" | "mailto") {
        return;
    }
    #[cfg(target_os = "macos")]
    let _ = (app, std::process::Command::new("open").arg(url.as_str()).spawn());

    #[cfg(target_os = "ios")]
    let _ = app.run_on_main_thread(move || unsafe {
        use objc2::{class, msg_send, runtime::{AnyObject, Bool}};
        let Ok(text) = std::ffi::CString::new(url.as_str()) else { return };
        let text: *mut AnyObject = msg_send![class!(NSString), stringWithUTF8String: text.as_ptr()];
        let url: *mut AnyObject = msg_send![class!(NSURL), URLWithString: text];
        let app: *mut AnyObject = msg_send![class!(UIApplication), sharedApplication];
        let options: *mut AnyObject = msg_send![class!(NSDictionary), dictionary];
        let done: Option<&block2::Block<dyn Fn(Bool)>> = None;
        let _: () = msg_send![app, openURL: url, options: options, completionHandler: done];
    });
}

// The Mac app's way to hand the reader a file: a download link does nothing in the webview
// and the Mac share sheet has no save. The page gives a suggested name and the text, never a
// path: the file goes only where the reader pointed the panel. Answers false on a cancel.
#[cfg(target_os = "macos")]
#[tauri::command(async)]
fn save_file(app: tauri::AppHandle, name: String, text: String) -> Result<bool, String> {
    let path = match probe::save_dir() {
        Some(dir) => std::path::Path::new(&name).file_name().map(|name| dir.join(name)),
        None => {
            let (answer, panel) = std::sync::mpsc::channel();
            app.run_on_main_thread(move || {
                let _ = answer.send(save_panel(&name));
            })
            .map_err(|e| e.to_string())?;
            panel.recv().map_err(|e| e.to_string())?
        }
    };
    match path {
        Some(path) => std::fs::write(path, text).map(|_| true).map_err(|e| e.to_string()),
        None => Ok(false),
    }
}

// Main thread only. None when the reader cancels.
#[cfg(target_os = "macos")]
fn save_panel(name: &str) -> Option<std::path::PathBuf> {
    use objc2::{class, msg_send, runtime::AnyObject};
    const OK: isize = 1; // NSModalResponseOK
    let name = std::ffi::CString::new(name).ok()?;
    unsafe {
        let name: *mut AnyObject = msg_send![class!(NSString), stringWithUTF8String: name.as_ptr()];
        let panel: *mut AnyObject = msg_send![class!(NSSavePanel), savePanel];
        let _: () = msg_send![panel, setNameFieldStringValue: name];
        let answer: isize = msg_send![panel, runModal];
        if answer != OK {
            return None;
        }
        let url: *mut AnyObject = msg_send![panel, URL];
        let path: *mut AnyObject = msg_send![url, path];
        let path: *const std::ffi::c_char = msg_send![path, UTF8String];
        if path.is_null() {
            return None;
        }
        Some(std::ffi::CStr::from_ptr(path).to_str().ok()?.into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // iOS buys through In-App Purchase. Only iOS builds the plugin, so only iOS has
    // window.__TAURI__.storekit, and that is how the page tells the iOS build apart.
    #[cfg(target_os = "ios")]
    let builder = builder.plugin(tauri_plugin_storekit::init());

    #[cfg(target_os = "macos")]
    let builder = builder.invoke_handler(tauri::generate_handler![open_url, save_file, probe::abort_modal]);
    #[cfg(not(target_os = "macos"))]
    let builder = builder.invoke_handler(tauri::generate_handler![open_url]);

    builder
        .register_uri_scheme_protocol("probe", |_ctx, req| {
            probe::report(&req.uri().to_string());
            tauri::http::Response::new(Vec::new())
        })
        .setup(|app| {
            let window =
                tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::default())
                    .initialization_script(LINKS_OUT)
                    .on_page_load(|window, payload| links_in::on_page_load(&window, payload.event()));
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            let window = if probe::requested() {
                window.initialization_script(probe::OPEN_URL_LISTENER)
            } else {
                window
            };

            // iOS honours a size and clips the page to it, so only desktop gets one. The window
            // opens as wide as the page's one column (`app` in tailwind.config.js), so a fresh
            // launch has no margin beside it; in a wider window the column sits in the middle.
            #[cfg(desktop)]
            let window = window
                .title("Follow Along")
                .inner_size(COLUMN, 800.0)
                .min_inner_size(380.0, 480.0);
            // The blue app bar already says the name; the native bar keeps the lights only.
            #[cfg(target_os = "macos")]
            let window = window.hidden_title(true);

            let window = window.build()?;
            if probe::requested() {
                probe::spawn(window);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Follow Along")
        .run(|app, event| {
            if let tauri::RunEvent::Opened { urls } = event {
                links_in::opened(app, urls);
            }
        });
}
