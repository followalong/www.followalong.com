import Adapter from './adapter.js'

const DEFAULT_URL = 'https://cors-anywhere.followalong.com/'

class CORSAnywhere extends Adapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.adapter = 'cors-anywhere'
    this.name = this.data.name || 'CORS Anywhere'
    this.description = this.data.description || 'Use the "CORS Anywhere" demo server! Please don\'t abuse this addon, as you can <a href="https://github.com/Lewiscowles1986/cors-anywhere" target="_blank" class="link" onclick="event.stopImmediatePropagation();">quickly deploy your own version</a> to Heroku (or elsewhere).'
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

  preview () {
    return `${this.data.name || this.name} (${this.data.url})`
  }
}

CORSAnywhere.FIELDS = {
  url: {
    type: 'text',
    label: 'URL',
    required: true,
    placeholder: DEFAULT_URL
  }
}

export default CORSAnywhere
