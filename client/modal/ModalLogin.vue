<template>
  <div class="modal-login">
    test *{{ _ && _.players }}*{{ players }}*
  </div>
</template>

<script>
import playersMixin from '../game/players.js'

export default {
  name: 'modal-login',
  mixins: [playersMixin]
}
</script>

<style>
.modal-login {
	padding: 20px;
	background-color: white;
	color: black;
	display: inline-block;
  z-index: 10;
  position: absolute;
  left: 10px;
  top: 10px;
}
</style>
