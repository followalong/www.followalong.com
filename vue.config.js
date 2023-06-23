module.exports = {
  pwa: {
    name: 'Follow Along',
    themeColor: '#005B7C',
    msTileColor: '#005B7C',
    appleMobileWebAppCapable: 'yes',
    // appleMobileWebAppStatusBarStyle: 'black',
    iconPaths: {
      favicon32: 'img/icons/favicon-32x32.png',
      favicon16: 'img/icons/favicon-16x16.png',
      appleTouchIcon: 'img/icons/apple-touch-icon.png',
      maskIcon: 'img/icons/safari-pinned-tab.svg',
      msTileImage: 'img/icons/msapplication-icon-144x144.png'
    },
    workboxOptions: {
      exclude: ['CNAME'],
      maximumFileSizeToCacheInBytes: 5000000
    }
  },
  css: {
    sourceMap: process.env.NODE_ENV === 'production'
  }
}
