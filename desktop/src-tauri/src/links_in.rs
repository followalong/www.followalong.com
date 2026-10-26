// Links into the app: a Universal Link (https://www.followalong.com/...) or the followalong://
// scheme, on macOS and iOS. tao turns both into RunEvent::Opened, at launch or while running.
// Each one is left on `window.followalongLinks`, the whole URL with its fragment, because the app's
// own links carry their payload there (#setup=..., #signin=...), and `open-url` says so. The page
// can finish loading before its script listens, so it also takes what is waiting when it boots. A
// link that arrives before the page has loaded waits for it.

use std::sync::Mutex;
use tauri::{webview::PageLoadEvent, AppHandle, Manager, Runtime, Url, WebviewWindow};

static STATE: Mutex<State> = Mutex::new(State { loaded: false, waiting: Vec::new() });

struct State {
    loaded: bool,
    waiting: Vec<String>,
}

pub fn opened<R: Runtime>(app: &AppHandle<R>, urls: Vec<Url>) {
    let mut state = STATE.lock().unwrap();
    state.waiting.extend(urls.iter().map(|u| u.to_string()));
    if state.loaded {
        if let Some(window) = app.get_webview_window("main") {
            deliver(&window, std::mem::take(&mut state.waiting));
        }
    }
}

pub fn on_page_load<R: Runtime>(window: &WebviewWindow<R>, event: PageLoadEvent) {
    let mut state = STATE.lock().unwrap();
    state.loaded = matches!(event, PageLoadEvent::Finished);
    if state.loaded {
        deliver(window, std::mem::take(&mut state.waiting));
    }
}

fn deliver<R: Runtime>(window: &WebviewWindow<R>, urls: Vec<String>) {
    for url in urls {
        let _ = window.eval(&dispatch(&url));
    }
}

fn dispatch(url: &str) -> String {
    format!(
        "(window.followalongLinks = window.followalongLinks || []).push({}); window.dispatchEvent(new Event('open-url'))",
        serde_json::to_string(url).unwrap_or_default()
    )
}

#[cfg(test)]
mod tests {
    use super::dispatch;

    #[test]
    fn hands_the_whole_url_over_as_a_string() {
        let link = "https://www.followalong.com/#setup=a%2Bb&x=\"'<";
        assert_eq!(
            dispatch(link),
            r#"(window.followalongLinks = window.followalongLinks || []).push("https://www.followalong.com/#setup=a%2Bb&x=\"'<"); window.dispatchEvent(new Event('open-url'))"#
        );
    }
}
