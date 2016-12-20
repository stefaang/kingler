import { inert } from '../lib.js'

const introZoom = 2

const options = {
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v9',
  center: [3.7250, 51.05],
  zoom: 14 - introZoom,

  // Making it fancy
  pitch: 45
}

export default {
  methods: {
    // Options passed to initMap will be merged with the defaults above
    initMap(opts) {
      Object.assign(options, opts)
      this.map = new mapboxgl.Map(options)

      this.map.addControl(new mapboxgl.NavigationControl())




      // this.playerMarkers.map(m => m.addTo(map))
      // console.log('Leaflet is ready.')

      if (introZoom) {
        setTimeout(() => this.flyTo({ zoom: options.zoom + introZoom }), 1000)
      }
    },
    flyTo(opts) {
      this.map.flyTo(Object.assign({
        speed: 0.6,
        curve: 1
      }, options, opts))
    },
    createMarker(player) {
      console.log('creating player', inert(player.position))
      var marker = document.createElement('div');
      marker.className = 'marker'
      marker.textContent = (player.name || '').slice(0, 3)
      var el = document.createElement('div');
      el.appendChild(marker)
  
      var marker = new mapboxgl.Marker(el)
        .setLngLat(player.position)
        .addTo(this.map)
      return marker
    }
  }
}
