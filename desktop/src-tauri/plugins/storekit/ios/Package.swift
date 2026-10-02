// swift-tools-version:5.5
// 5.5 is the first tools version that can name iOS 15, which StoreKit 2 needs.

import PackageDescription

let package = Package(
  name: "tauri-plugin-storekit",
  platforms: [
    .iOS(.v15)
  ],
  products: [
    .library(name: "tauri-plugin-storekit", type: .static, targets: ["tauri-plugin-storekit"])
  ],
  dependencies: [
    // The build helper copies tauri's Swift API here on every build.
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(name: "tauri-plugin-storekit", dependencies: [.byName(name: "Tauri")], path: "Sources")
  ]
)
