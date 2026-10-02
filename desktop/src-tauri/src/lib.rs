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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // iOS buys through In-App Purchase. Only iOS builds the plugin, so only iOS has
    // window.__TAURI__.storekit, and that is how the page tells the iOS build apart.
    #[cfg(target_os = "ios")]
    let builder = builder.plugin(tauri_plugin_storekit::init());

    builder
        .invoke_handler(tauri::generate_handler![open_url])
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

            // iOS honours a size and clips the page to it, so only desktop gets one.
            #[cfg(desktop)]
            let window = window
                .title("Follow Along")
                .inner_size(1100.0, 800.0)
                .min_inner_size(380.0, 480.0);

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
