// `PROBE=1` prints what the webview can do, then exits. A terminal cannot screenshot the Mac
// app and iOS has no console, so this is how either webview is read from outside.
// iOS discards stdout: the report is also written to probe-report.txt in the app container.
// `PROBE_PRODUCTS=<id>,<id>` also asks StoreKit for those products (the iOS build only).
// The Mac build only: `PROBE_SAVE_DIR=<dir>` makes `save_file` write into that directory with
// no panel, and the probe saves a file directly and through the You page. `PROBE_PANELS=1`
// opens the real open and save panels and ends each within a second, with nobody at the screen.
// `PROBE_WIDTH=<points>` makes the window that wide first, to measure the layout in a narrow one.

// Set before the page loads, so the report can show a link that arrived at launch.
pub const OPEN_URL_LISTENER: &str =
    "window.addEventListener('open-url', (e) => (window.__probeOpenUrls ||= []).push(e.detail.url))";

pub fn requested() -> bool {
    std::env::var_os("PROBE").is_some()
}

// Where `save_file` writes with no panel. A probe run only: the page cannot set it.
#[cfg(target_os = "macos")]
pub fn save_dir() -> Option<std::path::PathBuf> {
    requested().then(|| std::env::var_os("PROBE_SAVE_DIR")).flatten().map(Into::into)
}

// Ends the next modal panel: a second from now, or as it opens when that is later. The timer
// lives in the modal run loop mode only, so it does nothing until a panel runs.
#[cfg(target_os = "macos")]
fn abort_next_modal() {
    use objc2::{class, msg_send, runtime::AnyObject, sel};
    unsafe {
        let mode: *mut AnyObject = msg_send![class!(NSString), stringWithUTF8String: c"NSModalPanelRunLoopMode".as_ptr()];
        let modes: *mut AnyObject = msg_send![class!(NSArray), arrayWithObject: mode];
        let app: *mut AnyObject = msg_send![class!(NSApplication), sharedApplication];
        let nothing: *mut AnyObject = std::ptr::null_mut();
        let _: () = msg_send![app, performSelector: sel!(abortModal), withObject: nothing, afterDelay: 1.0f64, inModes: modes];
    }
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn abort_modal(app: tauri::AppHandle) {
    if requested() {
        let _ = app.run_on_main_thread(abort_next_modal);
    }
}

fn save_mode() -> &'static str {
    if std::env::var_os("PROBE_SAVE_DIR").is_some() {
        "dir"
    } else if std::env::var_os("PROBE_PANELS").is_some() {
        "panels"
    } else {
        ""
    }
}

pub fn report(uri: &str) {
    let text = tauri::Url::parse(uri)
        .ok()
        .and_then(|url| url.query_pairs().find(|(k, _)| k == "report").map(|(_, v)| v.into_owned()))
        .unwrap_or_default();
    println!("--- webview probe ---\n{text}");
    if let Some(home) = std::env::var_os("HOME") {
        let _ = std::fs::write(std::path::Path::new(&home).join("probe-report.txt"), &text);
    }
    std::process::exit(0);
}

pub fn spawn(window: tauri::WebviewWindow) {
    std::thread::spawn(move || {
        #[cfg(desktop)]
        if let Some(width) = std::env::var("PROBE_WIDTH").ok().and_then(|w| w.parse::<f64>().ok()) {
            let _ = window.set_size(tauri::LogicalSize::new(width, 800.0));
        }
        // Time for the reader to mount and try its first feeds.
        std::thread::sleep(std::time::Duration::from_secs(8));
        let products = std::env::var("PROBE_PRODUCTS").unwrap_or_default().replace(['"', '\\'], "");
        // The file input is clicked first thing in the script, so its panel's end is set up here.
        #[cfg(target_os = "macos")]
        if save_mode() == "panels" {
            let _ = window.run_on_main_thread(abort_next_modal);
        }
        let script = include_str!("probe.js").replace("__PROBE_PRODUCTS__", &products).replace("__PROBE_SAVE__", save_mode());
        let _ = window.eval(&script);
        std::thread::sleep(std::time::Duration::from_secs(40));
        eprintln!("probe timed out");
        std::process::exit(1);
    });
}
