<template>
  <div class="page-home">
    <!-- Useless navbar -->
    <!-- <top-nav></top-nav> -->
    <div class="container">
      <div class="starter-template">
        <div class="img">
          <img src="static/css/images/ezgif-optimized.gif" id="pacmananim" />
        </div>
        <h2>Welcome to da party!</h2>
        <p class="bs-component">
          <a href="/map" @click="routeClick" class="btn btn-primary btn-lg">Single Player</a>
          <a href="/logout" @click="routeClick" class="btn btn-primary btn-lg">Multi Player</a>
        </p>
        <p class="bs-component">
          <a href="/logout" @click="routeClick" class="btn btn-default btn-lg">Logout</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import TopNav from './TopNav.vue'

export default {
  name: 'page-home',
  components: {
    TopNav
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
