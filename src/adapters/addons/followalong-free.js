import AddonAdapter from '../addon.js'

class FollowAlongFreeAddonAdapter extends AddonAdapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.adapter = 'followalong-free'
    this.name = this.data.name || 'FollowAlong Free'
    this.supports = ['rss', 'search']

    this.AWS_CONFIG = {
      endpoint: 'lambda.us-east-1.amazonaws.com',
      region: 'us-east-1',
      accessKeyId: atob('QUtJQVZCVlI1Sk02U002TDVUTEU='),
      secretAccessKey: atob('SFFOQ2RWdVQ3VXc5UUJvU0habTFSd01hdFB5Qm5oTm5iMDdwZXJsVA')
    }
  }

  _request (data) {
    return new Promise((resolve, reject) => {
      this.awsLambda({
        endpoint: this.awsEndpoint(this.AWS_CONFIG.endpoint),
        accessKeyId: this.AWS_CONFIG.accessKeyId,
        secretAccessKey: this.AWS_CONFIG.secretAccessKey,
        region: this.AWS_CONFIG.region,
        apiVersion: 'latest'
      }).invoke({
        FunctionName: 'followalong-passthrough',
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Payload: JSON.stringify(data)
      }, function (err, data) {
        if (err) {
          return reject(err)
        }

        try {
          resolve(JSON.parse(data.Payload))
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  rss (url) {
    return this._request({
      action: 'rss',
      url: btoa(url)
    })
  }

  search (q) {
    return this._request({
      action: 'search',
      q
    })
  }
}

export default FollowAlongFreeAddonAdapter
