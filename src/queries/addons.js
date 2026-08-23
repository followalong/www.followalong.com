import CORSAnywhere from '../adapters/addons/cors-anywhere.js'
import FollowAlongFree from '../adapters/addons/followalong-free.js'
// import UnreadSummarizerFree from '../adapters/addons/summarizer-free.js'
import EntrySummarizerFree from '../adapters/addons/entry-summarizer-free.js'
import None from '../adapters/addons/none.js'
import S3Adapter from '../adapters/addons/s3.js'

const ADAPTERS = [
  // None,
  FollowAlongFree,
  EntrySummarizerFree,
  // UnreadSummarizerFree,
  CORSAnywhere,
  S3Adapter
]

export { ADAPTERS, None }
