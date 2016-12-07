<template>
  <div id="map" class="page-map leaflet-container leaflet-fade-anim"></div>
</template>

<script>
import { inert } from '../lib.js'
import playersMixin from '../game/players.js'
import mapboxMixin from '../mixins/mapbox.js'

mapboxgl.accessToken = 'pk.eyJ1IjoidGhnaCIsImEiOiJjaXdlMTJiczkwMDZ6MnRvNmdjODNmOTBlIn0.8aeMZVbu2uuPDXKcpDmZVw';

export default {
  name: 'page-map',
  mixins: [
    playersMixin,
    mapboxMixin
  ],
  data () {
    return {
      markers: []
    }
  },
  computed: {
  },
  methods: {
  },
  mounted () {
    this.initMap()
    this.oldPlayers = []
  },
  watch: {
    players: {
      deep: true,
      handler (val) {
        const old = this.oldPlayers
        console.log('playersChanged')
        val.forEach((p, i) => {
          if (!p) {
            return console.warn('Expected a player object in the players array')
          }
          if (p && !old[i]) {
            // Add new
            this.markers[i] = this.createMarker(p)
            return console.log('created')
          }
          if (p.name !== old[i].name) {
            // Complete redraw
            this.markers[i].remove()
            this.markers[i] = this.createMarker(p)
            return console.log('removed')
          }
          if (p.position[0] !== old[i].position[0] || p.position[1] !== old[i].position[1]) {
            // Move location
            this.markers[i].setLngLat(p.position)
            return console.log('moved')
          }
          console.log('nothing', p, i)
        })
        if (val.length < old.length) {
          console.warn('to implement: remove players from field')
        }
        this.oldPlayers = inert(val)
      }
    }
  }
}
</script>

<style>
.page-map {
  position: absolute;
  z-index: 1;
  left: 0;
  right: 0;
  top:0;
  bottom: 0;
  overflow: hidden;
}
.marker {
  width: 64px;
  height: 64px;
  transform: perspective(100px) rotateX(45deg);
  font-size: 32px;
  border-radius: 50%;
  line-height: 64px;
  background-color: black;
  color: white;
  text-align: center;
  transform: perspective(300px) rotateX(45deg) ;
}
</style>
