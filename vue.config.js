// import webpack from 'webpack'

module.exports = {
  entry: './client/index.js',
  dist: './kingler/static/dist/',
  resolve: './client',
  live: true,
  port: 8080,
  hash: false,
  mergeConfig: {
    performance: {
      hints: false
    }
  }
}
