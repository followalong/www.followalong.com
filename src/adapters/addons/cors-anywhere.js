import AddonAdapter from '../addon.js'

class CORSAnywhere extends AddonAdapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.adapter = 'cors-anywhere'
    this.name = this.data.name || 'CORS Anywhere'
    this.description = this.data.description || 'Use the "CORS Anywhere" demo server! Please don\'t abuse this addon, as you can <a href="https://github.com/Lewiscowles1986/cors-anywhere" target="_blank" class="link" onclick="event.stopImmediatePropagation();">quickly deploy your own version</a> to Heroku (or elsewhere).'
    this.data.url = this.data.url || 'https://followalong-cors-anywhere.herokuapp.com/'
    this.supports = ['rss']
    this.fields = {
      url: {
        type: 'text',
        label: 'URL',
        required: true,
        placeholder: 'https://followalong-cors-anywhere.herokuapp.com/'
      }
    }
  }

  rss (url) {
    return new Promise((resolve, reject) => {
      if (!url) return reject(new Error('No URL supplied.'))

      this.fetch.call(window, (this.data.url || '') + url)
        .then((response) => {
          if (response.ok) {
            resolve({
              status: response.status,
              body: response.text()
            })
          } else {
            reject(new Error(response.text()))
          }
        })
        .catch(reject)
    })
  }

  preview () {
    return `${this.data.name || this.name} (${this.data.url})`
  }
}

export default CORSAnywhere
