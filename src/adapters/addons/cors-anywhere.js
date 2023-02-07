import Adapter from './adapter.js'

const DEFAULT_URL = 'https://cors-anywhere.followalong.com/'

class CORSAnywhere extends Adapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.title = 'RSS Proxy (CORSAnywhere)'
    this.description = 'Access feeds on... the rest of the internet'
    this.preview = this.data.url
    this.fields = {
      url: {
        type: 'text',
        label: 'URL',
        required: true,
        placeholder: DEFAULT_URL
      }
    }
    this.adapter = 'cors-anywhere'
    this.data.url = this.data.url || DEFAULT_URL
  }

  rss (url) {
    return new Promise((resolve, reject) => {
      if (!url) return reject(new Error('No URL supplied.'))

      this.fetch((this.data.url || '') + url)
        .then(resolve)
        .catch(reject)
    })
  }
}

export default CORSAnywhere
