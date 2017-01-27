import { inert } from '../lib.js'

const introZoom = 2;

const options = {
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v9',
  center: [3.7250, 51.05],
  zoom: 14 - introZoom,

  // Make it fancy 3D
  pitch: 45
};

export default {
  computed: {
    playerMarkers () {
      this.$nextTick(_ => this.$emit('playersChanged'));
      return state.list.map(toPlayerMarker)
    }
  },
  methods: {

    // Options passed to initMap will be merged with the defaults above
    initMap(opts) {
      Object.assign(options, opts);
      this.map = new mapboxgl.Map(options);

      let map = this.map;
      map.addControl(new mapboxgl.NavigationControl());

      map.addControl(new mapboxgl.GeolocateControl({
          positionOptions: {
              enableHighAccuracy: true
          }
      }));


      this.playerMarkers.map(m => m.addTo(map))
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
      console.log('creating player', inert(player.position));

      // create an element and make it stylable
      var marker = document.createElement('div');
      marker.className = 'marker';
      marker.textContent = (player.name || '').slice(0, 3);
      var el = document.createElement('div');
      el.appendChild(marker);

      // create a mapbox marker from this element and add it to the map
      var marker = new mapboxgl.Marker(el)
        .setLngLat(player.position)
        .addTo(this.map);
      return marker
    },

    moveMarker(marker, newpos) {
      return marker.setLngLat(newpos)
    },
  }
}

function toPlayerMarker (player) {
  return window.L.marker(player.position, {
    title: player.name
  })
}
