import Adapter from './adapter.js'

const URL = 'https://cors-anywhere.followalong.com/'

class FollowAlongFree extends Adapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.title = 'FollowAlong Proxy (Free)'
    this.description = 'Many feeds are not only accessible cross-origin, so a proxy server must be used to fetch the feeds. This add-on is our deployed instance of <a href="https://github.com/Rob--W/cors-anywhere">CORS Anywhere</a>. Don\'t trust us with your data? Good! Deploy your own CORS Anywhere instance and use it via the "CORSAnywhere Proxy" add-on. This service is provided so that you can see the value of a CORS-supporting FollowAlong.'
    this.preview = 'Fetches RSS requests via our free proxy'
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
