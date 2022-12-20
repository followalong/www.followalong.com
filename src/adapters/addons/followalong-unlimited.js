import FollowAlongFree from './followalong-free.js'

class FollowAlongUnlimitedAddonAdapter extends FollowAlongFree {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.adapter = 'followalong-unlimited'
    this.name = this.data.name || 'FollowAlong Unlimited'
    this.description = 'One Year of <strong>unlimited access to our proxy server</strong> AND <strong>fully-encrypted data storage</strong> (eg. we can\'t read it) for $29 USD. No throttling, logging, or tracking.'
    this.supports = []
    // this.supports = ['rss', 'search']
    this.pricing = {
      stripe: {
        publishableKey: 'asdf',
        price: 29,
        currency: 'USD',
        method: 'stripe'
      },
      bitcoin: {
        price: 0.0001,
        currency: 'USD',
        method: 'bitcoin'
      }
    }
    this.fields = {
      token: {
        type: 'password',
        label: 'Token',
        required: true
      }
      // expiry: {
      //   type: 'date',
      //   label: 'Expiry Date',
      //   disabled: true
      // }
    }
  }
}

export default FollowAlongUnlimitedAddonAdapter
