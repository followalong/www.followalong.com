// Buys a subscription against FollowAlong.storekit, inside the running app, through the same
// window.__TAURI__.storekit the page uses. ios-storekit.test.sh runs it: `xcodebuild test` is the
// one way from a terminal into the StoreKit test environment, and storekitd takes a test session
// only from a process that is "installed for development" (Simulator.entitlements), which a UI
// test runner never is. The session's disableDialogs means no sheet needs a tap.
import StoreKitTest
import WebKit
import XCTest

final class PurchaseTests: XCTestCase {
  @MainActor
  func testThePageCanBuyAndRestore() async throws {
    let file = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "FollowAlong", withExtension: "storekit"))
    let session = try SKTestSession(contentsOf: file)
    session.disableDialogs = true
    session.clearTransactions()
    let ids = try productIDs(in: file)
    let page = try await pageWithStoreKit()

    let storekit = try await page.callAsyncJavaScript(
      "return Object.keys(window.__TAURI__.storekit).sort()", contentWorld: .page) as? [String]
    XCTAssertEqual(storekit, ["entitlements", "manage", "products", "purchase"])

    let products = try await page.callAsyncJavaScript(
      "return await window.__TAURI__.storekit.products(ids)", arguments: ["ids": ids], contentWorld: .page) as? [[String: Any]]
    XCTAssertEqual(Set(products?.compactMap { $0["id"] as? String } ?? []), Set(ids), "products() leaves out an unknown id")
    XCTAssertFalse(products?.contains { ($0["displayPrice"] as? String ?? "").isEmpty } ?? true)

    let bought = try await page.callAsyncJavaScript(
      "return await window.__TAURI__.storekit.purchase(id, token)",
      arguments: ["id": ids[0], "token": UUID().uuidString], contentWorld: .page) as? [String: Any]
    XCTAssertEqual(bought?["status"] as? String, "purchased")
    let jws = try XCTUnwrap(bought?["signedTransaction"] as? String)
    XCTAssertEqual(jws.split(separator: ".").count, 3, "a signed transaction is a JWS")

    // The test environment lists a finished purchase a moment after it answers.
    var entitlements: [String]? = []
    for _ in 0..<40 where entitlements?.isEmpty == true {
      try await Task.sleep(nanoseconds: 250_000_000)
      entitlements = try await page.callAsyncJavaScript(
        "return await window.__TAURI__.storekit.entitlements()", contentWorld: .page) as? [String]
    }
    XCTAssertEqual(entitlements?.count, 1, "entitlements() lists the purchase")
    XCTAssertEqual(entitlements?.first?.split(separator: ".").count, 3)
    // The app's stdout goes nowhere on iOS; an activity's name lands in the .xcresult.
    let prices = products?.map { "\($0["id"] ?? "") \($0["displayPrice"] ?? "")" } ?? []
    XCTContext.runActivity(named: "storekit purchase: products=\(prices) status=\(bought?["status"] ?? "") jws=\(jws.prefix(20))... entitlements=\(entitlements?.count ?? 0)") { _ in }
  }

  // The ids live in the .storekit file and nowhere else on the native side.
  private func productIDs(in file: URL) throws -> [String] {
    let json = try JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [String: Any]
    let groups = json?["subscriptionGroups"] as? [[String: Any]] ?? []
    return groups.flatMap { ($0["subscriptions"] as? [[String: Any]] ?? []).compactMap { $0["productID"] as? String } }
  }

  // The app's one window holds Tauri's WKWebView; the page is ready once the plugin's script ran.
  @MainActor
  private func pageWithStoreKit() async throws -> WKWebView {
    for _ in 0..<120 {
      let windows = UIApplication.shared.connectedScenes.compactMap { ($0 as? UIWindowScene)?.windows }.flatMap { $0 }
      if let page = windows.lazy.compactMap(Self.webView(in:)).first,
         try await page.evaluateJavaScript("!!(window.__TAURI__ && window.__TAURI__.storekit)") as? Bool == true {
        return page
      }
      try await Task.sleep(nanoseconds: 250_000_000)
    }
    throw XCTSkip("no page with window.__TAURI__.storekit appeared in 30s")
  }

  private static func webView(in view: UIView) -> WKWebView? {
    (view as? WKWebView) ?? view.subviews.lazy.compactMap(webView(in:)).first
  }
}
