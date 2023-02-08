import Adapter from './adapter.js'

const URL = 'https://cors-anywhere.followalong.com/'

class FollowAlongFree extends Adapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.title = 'FollowAlong RSS Proxy (Free)'
    this.description = 'Many feeds are not only accessible cross-origin, so a proxy server can be used to fetch the feeds. This add-on is our deployed instance of <a href="https://github.com/Rob--W/cors-anywhere">CORS Anywhere</a>.'
    this.preview = URL
    this.fields = {}
  }

  validate (data) {
    return true
  }

  rss (url) {
    return new Promise((resolve, reject) => {
      if (!url) return reject(new Error('No URL supplied.'))

      this.fetch(URL + url)
        .then(resolve)
        .catch(reject)
    })
  }
}

export default FollowAlongFree
