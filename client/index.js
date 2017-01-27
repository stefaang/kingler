import Vue from 'vue'
import App from './App.vue'

import 'normalize.css'

import polyfill from './global/polyfill.js'
import router from './global/router.js'
import store from './global/store.js'
Vue.use(polyfill)
Vue.use(router)
Vue.use(store)

window.$root = new Vue({
  el: '#app',
  render: h => h(App)
})
