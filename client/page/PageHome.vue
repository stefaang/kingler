<template>
  <div class="page home-wrapper">
    <input type="text" v-model="nick" placeholder="username">
    <party-list />
  </div>
</template>

<script>
import TopNav from './TopNav.vue'
import PartyList from '../components/PartyList.vue'

export default {
  name: 'page-home',
  computed: {
    nick: {
      get  () {
        return window.localStorage['nick'] || this.$state.user.nick
      },
      set (v) {
        this.$state.user.nick = v
        window.localStorage['nick'] = v
      }
    }
  },
  components: {
    PartyList
  }
}
</script>

<style>
.page-home {
  overflow: hidden;
}
#pacmananim {
  position: relative;
  left: -100vw;
  animation-name: example;
  animation-duration: 20s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes example {
  0%   {left: -100vw;transform: rotateY(0);}
  49% {left: 100vw;transform: rotateY(0);}
  50% {left: 100vw;transform: rotateY(180deg);}
  100% {left: -100vw;transform: rotateY(180deg);}
}
</style>
