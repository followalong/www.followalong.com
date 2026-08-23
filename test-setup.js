/* global globalThis */
import { webcrypto } from 'crypto'

// jsdom ships crypto.getRandomValues but no subtle; the app only ever uses
// globalThis.crypto, so give the test environment the real thing.
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}
