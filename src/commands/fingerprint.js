// Enough of a summary of the log to tell "the bucket already has exactly
// this" from "something changed", without keeping a second copy of it.
//
// Two FNV-1a passes with different offsets and primes, plus the length. One
// 32-bit pass over a megabyte collides often enough to matter, and a
// collision here means skipping an upload the bucket needed. Math.imul
// because the products run past what a double holds exactly.
const PRIME_A = 16777619
const PRIME_B = 16777639

const fingerprint = (text) => {
  const value = `${text || ''}`
  let a = 2166136261
  let b = 3735928559

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)

    a = Math.imul(a ^ code, PRIME_A) >>> 0
    b = Math.imul(b ^ code, PRIME_B) >>> 0
  }

  return `${value.length}:${a.toString(36)}:${b.toString(36)}`
}

export default fingerprint
