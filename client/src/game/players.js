import { inert } from '../lib.js'

// This is a Vue mixin that makes players accessible to other components
export default {
  data: function () { // data must be a function in components
    return {
      players
    }
  },
  computed: {
    playerMarkers () {
      this.$nextTick(_ => this.$emit('playersChanged'));
      return this.players.map(toPlayerMarker)
    }
  },
  methods: {

  }
}


// You may not overwrite this reference to the players array, only push, splice, ...
export const players = {};

// Move a player randomly
export function moveRandom (p) {
  let lng = p.position.longitude, lat = p.position.latitude;
  p.position = {
    longitude: lng + Math.random() * 0.002 - 0.001,
    latitude:  lat + Math.random() * 0.002 - 0.001
  }
}

// Move all players randomly
export function moveRandomAll () {
  for (let id in players) {
    moveRandom(players[id]);
  }
}


function toPlayerMarker (player) {
  return window.L.marker(player.position, {
    title: player.name
  })
}


// Some test stuff

setTimeout(function () {
  players.push({
    name: 'me',
    position: [3.7250, 51.05]
  })
}, 1000);
setTimeout(function () {
  players.push({
    name: 'you',
    position: [3.7250, 51.05]
  })
}, 2000);
setTimeout(function () {
  players.push({
    name: 'blub',
    position: [3.7250, 51.05]
  })
}, 3000);

setTimeout(function () {
  setInterval(moveRandomAll, 2000);
}, 10000);
