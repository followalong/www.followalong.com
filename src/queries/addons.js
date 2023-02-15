import CORSAnywhere from '../adapters/addons/cors-anywhere.js'
import FollowAlongFree from '../adapters/addons/followalong-free.js'
// import UnreadSummarizerFree from '../adapters/addons/summarizer-free.js'
import EntrySummarizerFree from '../adapters/addons/entry-summarizer-free.js'
import None from '../adapters/addons/none.js'

const ADAPTERS = [
  // None,
  FollowAlongFree,
  EntrySummarizerFree,
  // UnreadSummarizerFree,
  CORSAnywhere
]

export { ADAPTERS, None }
