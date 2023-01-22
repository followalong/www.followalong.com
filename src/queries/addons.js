import CORSAnywhere from '../adapters/addons/cors-anywhere.js'
import FollowAlongFree from '../adapters/addons/followalong-free.js'
import None from '../adapters/addons/none.js'

const ADAPTERS = [
  None,
  FollowAlongFree,
  CORSAnywhere
]

const ADDONS = [{
  type: 'rss',
  title: 'RSS Proxy',
  description: 'Access feeds on... the rest of the internet',
  adapters: ADAPTERS.filter((Adapter) => typeof (new Adapter().rss) !== 'undefined')
}]

export { ADDONS, ADAPTERS }
