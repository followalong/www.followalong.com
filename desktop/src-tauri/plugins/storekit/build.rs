// Adding a command touches four files: the Swift @objc method, this list, allow-<name> in
// permissions/default.toml, and the function in api-iife.js.
const COMMANDS: &[&str] = &["products", "purchase", "entitlements", "manage"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .global_api_script_path("./api-iife.js")
        .ios_path("ios")
        .build();
}
