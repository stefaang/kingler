// rollup.config.js
import vue from 'rollup-plugin-vue2'
import css from 'rollup-plugin-css-only'
import buble from 'rollup-plugin-buble'
import livereload from 'rollup-plugin-livereload'

export default {
  entry: 'src/main.js',
  dest: '../static/dist/bundle.js',
  sourceMap: true,
  plugins: [
    vue(),
    css(),
    buble(),
    process.argv.indexOf('--live') > 1 && livereload()
  ]
}