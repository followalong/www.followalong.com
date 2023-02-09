import CORSAnywhere from '../adapters/addons/cors-anywhere.js'
import FollowAlongFree from '../adapters/addons/followalong-free.js'
import SummarizerFree from '../adapters/addons/summarizer-free.js'
import None from '../adapters/addons/none.js'

const ADAPTERS = [
  // None,
  FollowAlongFree,
  SummarizerFree,
  CORSAnywhere
]

export { ADAPTERS, None }
