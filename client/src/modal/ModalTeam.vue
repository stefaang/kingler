<template>
  <div class="modal-team">
    <table class="table">
      <tbody>
        <tr v-for="player in players">
          <td>{{ player.name }}</td>
          <td>
            {{ player.position[0].toFixed(3) }}
          </td>
          <td>
            {{ player.position[1].toFixed(3) }}
          </td>
        </tr>
      </tbody>
    </table>
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
.modal-team {
	background-color: black;
	color: white;
	display: inline-block;
  z-index: 10;
  position: absolute;
  left: 10px;
  top: 10px;
}
.modal-team>table {
  margin-bottom: 0;
}
</style>
