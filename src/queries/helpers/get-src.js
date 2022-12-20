const VIDEO_TYPES = /\.(mp4)/
const AUDIO_TYPES = /\.(mp3|wav)/
const IMAGE_TYPES = /\.(png|jpeg|jpg|gif)/

const KNOWN_VIDEO_ITEM_LINK = ['bitchute.com']
const isKnownItemLink = (item) => {
  if (!item.link) {
    return false
  }

  return KNOWN_VIDEO_ITEM_LINK.filter((s) => item.link.indexOf(s) !== -1).length
}

const getImageSrc = (item) => {
  if (!item) {
    return undefined
  }

  if (item.image && IMAGE_TYPES.test(item.image.url)) {
    return item.image.url
  } else if (item.enclosure && IMAGE_TYPES.test(item.enclosure.url)) {
    return item.enclosure.url
  } else if (item.itunes && IMAGE_TYPES.test(item.itunes.image)) {
    return item.itunes.image
  }
}

const getVideoSrc = (item, autoplay) => {
  if (!item) {
    return undefined
  }

  if (item.guid && item.guid.slice(0, 9) === 'yt:video:') {
    return 'https://www.youtube.com/embed/' + item.guid.slice(9) + (autoplay ? '?&rel=0&modestbranding=1&playsinline=1&autoplay=1' : '')
  } else if (item['media:player']) {
    return item['media:player']
  } else if (item.enclosure && VIDEO_TYPES.test(item.enclosure.url)) {
    return item.enclosure.url
  } else if (VIDEO_TYPES.test(item.link)) {
    return item.link
  } else if (isKnownItemLink(item)) {
    return item.link
  }
}

const getAudioSrc = (item) => {
  if (!item) {
    return undefined
  }

  if (item.link && AUDIO_TYPES.test(item.link)) {
    return item.link
  } else if (item.enclosure && AUDIO_TYPES.test(item.enclosure.url)) {
    return item.enclosure.url
  }
}

export {
  getImageSrc,
  getVideoSrc,
  getAudioSrc
}
