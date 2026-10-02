import StoreKit
import SwiftRs
import Tauri
import UIKit
import WebKit

struct ProductsArgs: Decodable {
  let ids: [String]
}

struct PurchaseArgs: Decodable {
  let productId: String
  let appAccountToken: String
}

struct ProductInfo: Encodable {
  let id: String
  let displayName: String
  let displayPrice: String
}

// JSONEncoder leaves out a nil signedTransaction, so cancelled and pending carry only a status.
struct PurchaseOutcome: Encodable {
  let status: String
  var signedTransaction: String? = nil
}

class StoreKitPlugin: Plugin {
  private var updates: Task<Void, Never>?

  override init() {
    super.init()
    // Renewals and Ask to Buy approvals arrive here, outside any purchase call. Finishing them
    // stops StoreKit redelivering them; the page reads the result through `entitlements`.
    updates = Task.detached {
      for await result in Transaction.updates {
        if case .verified(let transaction) = result {
          await transaction.finish()
        }
      }
    }
  }

  @objc public func products(_ invoke: Invoke) {
    Task {
      do {
        let args = try invoke.parseArgs(ProductsArgs.self)
        // Unknown ids are left out of the answer, not thrown.
        let products = try await Product.products(for: args.ids)
        invoke.resolve(products.map {
          ProductInfo(id: $0.id, displayName: $0.displayName, displayPrice: $0.displayPrice)
        })
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func purchase(_ invoke: Invoke) {
    Task {
      do {
        let args = try invoke.parseArgs(PurchaseArgs.self)
        guard let token = UUID(uuidString: args.appAccountToken) else {
          return invoke.reject("appAccountToken is not a UUID: \(args.appAccountToken)")
        }
        guard let product = try await Product.products(for: [args.productId]).first else {
          return invoke.reject("No such product: \(args.productId)")
        }
        switch try await product.purchase(options: [.appAccountToken(token)]) {
        case .success(let result):
          guard case .verified(let transaction) = result else {
            return invoke.reject("StoreKit could not verify the transaction")
          }
          await transaction.finish()
          invoke.resolve(PurchaseOutcome(status: "purchased", signedTransaction: result.jwsRepresentation))
        case .userCancelled:
          invoke.resolve(PurchaseOutcome(status: "cancelled"))
        case .pending:
          invoke.resolve(PurchaseOutcome(status: "pending"))
        @unknown default:
          invoke.reject("StoreKit returned an unknown purchase result")
        }
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func entitlements(_ invoke: Invoke) {
    Task {
      var signed: [String] = []
      for await result in Transaction.currentEntitlements {
        if case .verified = result {
          signed.append(result.jwsRepresentation)
        }
      }
      invoke.resolve(signed)
    }
  }

  @objc public func manage(_ invoke: Invoke) {
    Task { @MainActor in
      guard let scene = self.manager.viewController?.view.window?.windowScene else {
        return invoke.reject("No window to show subscriptions in")
      }
      do {
        try await AppStore.showManageSubscriptions(in: scene)
        invoke.resolve()
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }
}

@_cdecl("init_plugin_storekit")
func initPlugin() -> Plugin {
  return StoreKitPlugin()
}
