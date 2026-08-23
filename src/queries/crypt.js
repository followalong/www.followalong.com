import aes256 from 'aes256'

// The synced payload is already a string (the event log), so these wrap it
// directly. An empty key means the identity opted out of encryption, and the
// payload passes through untouched.
const passThrough = () => (data) => data

const encrypt = (key) => {
  if (!key) {
    return passThrough()
  }

  return (data) => aes256.encrypt(key, data)
}

const decrypt = (key) => {
  if (!key) {
    return passThrough()
  }

  return (data) => aes256.decrypt(key, data)
}

export { encrypt, decrypt, passThrough }
