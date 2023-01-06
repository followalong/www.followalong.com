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
    }
  }
}

module.exports = args
