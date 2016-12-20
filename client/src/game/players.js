import { inert } from '../lib.js'

// You may not overwrite this reference to the players array, only push, splice, ...
export const players = []

// Move all players randomly
export function moveRandomAll () {
  players.forEach(moveRandom)
}

export function moveRandom (p) {
  for (const key in p.position) {
    p.position[key] = p.position[key] + (0.001 - Math.random() * 0.002)
  }
  p.position = inert(p.position)
}

// This is a Vue mixin
export default {
  data () {
    return {
      // This will allow to use this.players in the component it's included in
      players
    }
  },
  computed: {
    playerMarkers () {
      this.$nextTick(_ => this.$emit('playersChanged'))
      return this.players.map(toPlayerMarker)
    }
  },
  methods: {
    
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
}, 1000)
setTimeout(function () {
  players.push({
    name: 'you',
    position: [3.7250, 51.05]
  })
}, 2000)
setTimeout(function () {
  players.push({
    name: 'blub',
    position: [3.7250, 51.05]
  })
}, 3000)
setInterval(moveRandomAll, 1000)
