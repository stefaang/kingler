<template>
  <div class="modal-login">
    test *{{ players.length }}*
  </div>
</template>

<script>
export default {
  name: 'modal-login',
  computed: {
    players () {
      return this.$state.players.list
    }
  }
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
