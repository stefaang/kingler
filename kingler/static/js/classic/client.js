/**
 * Created by stefaan on 23.02.17.
 */

// open the tutorial

// enable geolocation
console.log("Start using Leaflet Location");
map.locate({
    watch: true,                // keep tracking
    enableHighAccuracy: true,   // enable GPS
    timeout: 30000
});
