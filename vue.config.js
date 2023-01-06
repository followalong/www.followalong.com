let args = {}

if (process.env.NODE_ENV === 'production') {
  args = {
    configureWebpack (config) {
      config.output.filename = '[name].js'
      config.output.chunkFilename = '[name].js'
    },
    css: {
      extract: {
        filename: '[name].css'
      }
    },
    pwa: {
      name: 'Follow Along',
      themeColor: '#005B7C',
      msTileColor: '#FBF7F0',
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
    }
  }
}

module.exports = args
