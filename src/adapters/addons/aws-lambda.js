import Adapter from './adapter.js'

class AWSLambda extends Adapter {
  constructor (adapterOptions, addonData) {
    super(adapterOptions, addonData)

    this.adapter = 'aws-lambda'
    this.name = this.data.name || 'AWS Lambda'
  }

  preview () {
    return this.data.name
  }
}

AWSLambda.FIELDS = []

// function lambdaPassthrough (override) {
//   override = override || {}
//
//   return function lambdaPassthroughFunc (identity, data) {
//     var _ = this
//
//     if (override.obfuscateUrl && data.url) {
//       data.url = btoa(data.url)
//     }
//
//     return new Promise((resolve, reject) => {
//       new AWS.Lambda({
//         endpoint: new AWS.Endpoint(override.endpoint || _.data.endpoint),
//         accessKeyId: override.accessKeyId || _.data.accessKeyId,
//         secretAccessKey: override.secretAccessKey || _.data.secretAccessKey,
//         region: override.region || _.data.region,
//         apiVersion: 'latest'
//       }).invoke({
//         FunctionName: override.functionName || _.data.functionName,
//         InvocationType: 'RequestResponse',
//         LogType: 'None',
//         Payload: JSON.stringify(data)
//       }, function (err, data) {
//         try {
//           resolve(JSON.parse(data.Payload))
//         } catch (e) {
//           reject(err)
//         }
//       })
//     })
//   }
// }
//
// // {
// //   id: 'aws-lambda',
// //   name: 'AWS Lambda',
// //   description: 'Use our source code <a href="https://github.com/followalong/followalong" target="_blank" class="link" onclick="event.stopImmediatePropagation();">here</a> to quickly deploy your own passthrough server to Amazon\'s Lambda.',
// //   fields: {
// //     name: {
// //       type: 'text',
// //       label: 'Addon Name',
// //       required: true
// //     },
// //     endpoint: {
// //       type: 'text',
// //       label: 'Endpoint',
// //       required: true
// //     },
// //     accessKeyId: {
// //       type: 'text',
// //       label: 'Access Key ID',
// //       required: true
// //     },
// //     secretAccessKey: {
// //       type: 'password',
// //       label: 'Secret Access Key',
// //       required: true
// //     },
// //     region: {
// //       type: 'text',
// //       label: 'Region',
// //       required: true
// //     },
// //     functionName: {
// //       type: 'text',
// //       label: 'Function Name',
// //       required: true
// //     }
// //   },
// //   data: {
// //     region: 'us-east-1',
// //     endpoint: AWS_CONFIG.endpoint
// //   },
// //   request: lambdaPassthrough()
// // }

export default AWSLambda
