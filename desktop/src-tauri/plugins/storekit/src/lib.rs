// In-App Purchase through StoreKit 2. iOS only: App Store guideline 3.1.1 requires it there,
// and the Mac buys through a web checkout. Every command lives in ios/; Tauri forwards
// `plugin:storekit|<command>` to the Swift plugin because nothing on the Rust side handles it.

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_storekit);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("storekit")
        .setup(|_app, _api| {
            #[cfg(target_os = "ios")]
            _api.register_ios_plugin(init_plugin_storekit)?;
            Ok(())
        })
        .build()
}
