// What App Store Connect sells, by product id, and how often each renews.
// Placeholders until the owner creates the products there.
const PRODUCTS = {
  'com.followalong.reader.sync.monthly': 'month',
  'com.followalong.reader.sync.yearly': 'year'
}

// StoreKit can hang on a device. Subscribe never waits on it longer than this.
const STOREKIT_MS = 10000

// The shelf: every product the store sells, priced in the reader's own
// storefront. A failure or a hang is an empty shelf.
const shelf = (storekit) => Promise.race([
  storekit.products(Object.keys(PRODUCTS)).then(
    (products) => products.map((product) => Object.assign({ every: PRODUCTS[product.id] }, product)),
    () => []
  ),
  new Promise((resolve) => setTimeout(resolve, STOREKIT_MS, []))
])

export { PRODUCTS, STOREKIT_MS, shelf }
