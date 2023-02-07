import Adapter from './adapter.js'

const DEFAULT_URL = 'https://cors-anywhere.followalong.com/'

class CORSAnywhere extends Adapter {
  constructor (adapterOptions, addonData) {
    addonData.url = addonData.url || DEFAULT_URL

    super(adapterOptions, addonData)

    this.title = 'CORSAnywhere RSS Proxy'
    this.description = 'Many feeds are not only accessible cross-origin, so a proxy server can be used to fetch the feeds. <a href="https://github.com/Rob--W/cors-anywhere">CORS Anywhere</a> is an open-source proxy which adds CORS headers to the proxied request. To configure, simply supply the URL of your deployed instance.'
    this.preview = this.data.url
    this.fields = {
      url: {
        type: 'text',
        label: 'URL',
        required: true,
        placeholder: DEFAULT_URL
      }
    }
  }

  configure () {
    // add feed or signal
  }

  uninstall () {
    // remove feed or signal
  }

  validate (data) {
    try {
      new URL(data.url)
      return true
    } catch (e) {}

    return false
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
