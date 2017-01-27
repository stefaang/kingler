import './global/polyfill.js'
import './global/router.js'
import App from './App.vue'

window.$root = new Vue({
  el: '#app',
  render: h => h(App)
})
