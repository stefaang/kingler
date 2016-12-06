<template>
  <div id="app">
    <page-home v-if="route.page=='home'"></page-home>
    <page-map v-if="route.page=='map'"></page-map>

    <modal-team v-if="route.modal=='team'"></modal-team>
  </div>
</template>

<script>
import PageHome from './page/PageHome.vue'
import PageMap from './page/PageMap.vue'

export default {
  name: 'app',
  data () {
    return {
      msg: 'Hello Vue!'
    }
  },
  components: {
    PageHome,
    PageMap
  }
}
</script>
