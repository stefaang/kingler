// You may not overwrite this reference to the players array, only push, splice, ...
export const players = []

// Move all players randomly
export function moveRandomAll () {
  players.forEach(moveRandom)
}

export function moveRandom (p) {
  for (const key in p.position) {
    p.position[key] = p.position[key] + (0.01 - Math.random() * 0.02)
  }
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
    position: [51.05, 3.75]
  })
  console.log(players.length)
}, 1000)
setTimeout(function () {
  players.push({
    name: 'you',
    position: [51.05, 3.75]
  })
  console.log(players.length)
}, 2000)
setTimeout(function () {
  players.push({
    name: 'blub',
    position: [51.05, 3.75]
  })
  console.log(players.length)
}, 3000)
setInterval(moveRandomAll, 3000)