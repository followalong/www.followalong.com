// `PROBE=1` prints what the webview can do, then exits. A terminal cannot screenshot the Mac
// app and iOS has no console, so this is how either webview is read from outside.
// iOS discards stdout: the report is also written to probe-report.txt in the app container.
// `PROBE_PRODUCTS=<id>,<id>` also asks StoreKit for those products (the iOS build only).

// Set before the page loads, so the report can show a link that arrived at launch.
pub const OPEN_URL_LISTENER: &str =
    "window.addEventListener('open-url', (e) => (window.__probeOpenUrls ||= []).push(e.detail.url))";

pub fn requested() -> bool {
    std::env::var_os("PROBE").is_some()
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
        // Time for the reader to mount and try its first feeds.
        std::thread::sleep(std::time::Duration::from_secs(8));
        let products = std::env::var("PROBE_PRODUCTS").unwrap_or_default().replace(['"', '\\'], "");
        let _ = window.eval(&include_str!("probe.js").replace("__PROBE_PRODUCTS__", &products));
        std::thread::sleep(std::time::Duration::from_secs(40));
        eprintln!("probe timed out");
        std::process::exit(1);
    });
}
