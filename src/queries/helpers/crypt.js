import aes256 from 'aes256'

const encrypt = (key) => {
  if (key) {
    return (data) => aes256.encrypt(key, JSON.stringify(data))
  } else {
    return passThrough()
  }
}

const decrypt = (key) => {
  if (key) {
    return (data) => {
      return JSON.parse(aes256.decrypt(key, data))
    }
  } else {
    return passThrough()
  }
}

const passThrough = () => {
  return (data) => data
}

export {
  decrypt,
  encrypt,
  passThrough
}
