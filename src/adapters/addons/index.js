import AWSLambda from './aws-lambda.js'
import CORSAnywhere from './cors-anywhere.js'
import FollowAlongFree from './followalong-free.js'
import FollowAlongUnlimited from './followalong-unlimited.js'
import Local from './local.js'
import None from './none.js'
import S3 from './s3.js'

const ADDONS = [
  None,
  Local,
  FollowAlongFree,
  FollowAlongUnlimited,
  CORSAnywhere,
  AWSLambda,
  S3
]

const getAddonAdapterByType = (adapter) => {
  for (let i = 0; i < ADDONS.length; i++) {
    if (new ADDONS[i]().adapter === adapter) {
      return ADDONS[i]
    }
  }

  return FollowAlongFree
}

export { ADDONS, getAddonAdapterByType }
