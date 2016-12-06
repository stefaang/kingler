<template>
  <div id="map" class="page-map leaflet-container leaflet-fade-anim"></div>
</template>

<script>
import playersMixin from '../game/players.js'

const L = window.L

export default {
  name: 'page-map',
  mixins: [playersMixin],
  computed: {
  },
  methods: {
    init() {
      var map = L.map('map', {
        dragging: true, // disable dragging the map
        touchZoom: false, // disable zooming on mobile
        // scrollWheelZoom: false,   // but not on PC
        doubleClickZoom: false, // zoom on center, wherever you click
        fullscreenControl: true,
        center: [51.05, 3.75],
        zoom: 12
      })

      L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>',
        // Add CartoDB tiles to the map
        // L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        //     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 21,
        maxNativeZoom: 18, // this allows to use a deeper maxZoom
        id: 'carto.light'
      }).addTo(map)


      this.playerMarkers.map(m => m.addTo(map))
      console.log('Leaflet is ready.')
    }
  },
  mounted () {
    this.init()
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
</style>