import Vue from 'vue'
import App from './App.vue'

import polyfill from './global/polyfill.js'
import router from './global/router.js'
Vue.use(polyfill)
Vue.use(router)

window.$root = new Vue({
  el: '#app',
  render: h => h(App)
})
