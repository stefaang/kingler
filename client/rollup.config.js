// rollup.config.js
import vue from 'rollup-plugin-vue2'
import css from 'rollup-plugin-css-only'
import buble from 'rollup-plugin-buble'

export default {
  entry: 'src/main.js',
  dest: '../static/dist/bundle.js',
  sourceMap: true,
  plugins: [
    vue(),
    css(),
    buble()
  ]
}