<template>
  <div id="app">
    <transition name="page">
      <page-home v-if="!isLoading && route.page == 'home'"></page-home>
    </transition>

    <page-map v-if="!isLoading && route.page == 'map'"></page-map>

    <modal-team v-if="!isLoading && route.modal == 'team'"></modal-team>
    <modal-login v-if="!isLoading && route.modal == 'login'"></modal-login>

    <div class="loader" :class="{ 'loader--done': !isLoading }"></div>
  </div>
</template>

<script>
import ModalLogin from './modal/ModalLogin.vue'
import ModalTeam from './modal/ModalTeam.vue'
import PageHome from './page/PageHome.vue'
import PageMap from './page/PageMap.vue'

export default {
  name: 'app',
  data () {
    return {
      isLoading: true
    }
  },
  mounted () {
    console.log('read')
    setTimeout(() => {
      this.isLoading = false
    }, 200)
  },
  components: {
    ModalLogin,
    ModalTeam,
    PageHome,
    PageMap
  }
}
</script>

<style>
#app {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.page {
  z-index: 1;
  max-width: 20em;
}

.page-enter-active, .page-leave-active {
  transition: opacity .5s
}
.page-enter, .page-leave-to {
  opacity: 0
}
</style>