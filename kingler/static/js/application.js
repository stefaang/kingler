'use strict';

// show the setup data provided by the server
console.log(flaskData);
console.log(flaskData.racers[0]);

// globals
var map = null;
var mrm = null;
var mrmColor = null;
var markers = {};
var colormap = {
    'red': '#A12F36',
    'green': '#00934F',
    'blue': '#0072B5'
};

var socket = null;

var teamScore = null;

//
// WIP: put all this stuff in a module
//


// SocketIO for realtime bidirectional messages between client and server
if (window.location.protocol == "https:") {
    var ws_scheme = "wss://";
} else {
    var ws_scheme = "ws://"
};

socket = io();
socket.on('connect', function() {
   socket.emit('derp event', {data: 'i am connecting hell yeah'});
   console.log("Websockets ready - connected");
});
console.log("Websockets initialized");


// enable vibration support
navigator.vibrate = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate;

// enable sound support
// user interaction is required on mobile devices --> a splash screen to activate sound
// for now, you just need to tap the map once
var sounds = {
    'bomb': new Howl({src: ['static/sound/bomb.mp3']}),
    'coin': new Howl({src: ['static/sound/coin.mp3']}),
    'whale': new Howl({src: ['static/sound/monster.mp3']}),
    'kraken': new Howl({src: ['static/sound/godzilla.mp3']}),
    'invincible': new Howl({src: ['static/sound/totally-not-mario.mp3']}),
};


// Icon definitions
var shipIcon = L.divIcon({
    className: 'ship-icon',
    iconSize: [80,80],
    iconAnchor: [40,65],
});

var coinIcon = L.divIcon({
    className: 'coin-icon',
    iconSize: [40,40],
});

var rumIcon = L.divIcon({
    className: 'rum-icon',
    iconSize: [40,40],
});

var whaleIcon = L.divIcon({
    className: 'whale-icon',
    iconSize: [120,120],
});

var krakenIcon = L.divIcon({
    className: 'kraken-icon',
    iconSize: [120,120],
});


// Stamen Tileset only works for bike routes as it doesn't scale deep enough
//L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg', {
//    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>',


// Add CartoDB tiles to the map. Styles must be dark/light + _ + all / nolabels / only_labels
// var darkLayer = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png', {
//    attribution: 'Mapdata © <a href="http://openstreetmap.org">OpenStreetMap</a>, ' +
//                 'Imagery © <a href="http://carto.com">Carto</a>',
//     maxZoom: 21,
//     maxNativeZoom: 18,  // this allows to use a deeper maxZoom
//     id: 'carto.dark'
// });

// Lite Pirate tileset by thunderforest. It's awesome but a bit heavy on data (jpg)

var liteLayer = L.tileLayer('https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=ca05b2d9cffa483aac7a95fdfb8b7607', {
    maxZoom: 18,
    attribution: 'Thunderforest',
    id: 'tf.pioneer',
});

// Dark (but not too dark) tileset by thunderforest. Would be 10/10 if labels were optional.

var darkLayer = L.tileLayer('https://{s}.tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey=ca05b2d9cffa483aac7a95fdfb8b7607', {
    maxZoom: 18,
    attribution: 'Thunderforest',
    id: 'tf.pioneer',
});

// Alternative tileset by thunderforest --> very detailed
//
//var forestLayer = L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=ca05b2d9cffa483aac7a95fdfb8b7607', {
//    maxZoom: 18,
//    attribution: 'Thunderforest',
// });

// Alternative tileset by MapBox

// var liteLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
//    maxZoom: 19,
//    attribution: 'Mapdata © <a href="http://openstreetmap.org">OpenStreetMap</a>, ' +
//                 'Imagery © <a href="http://mapbox.com">Mapbox</a>',
//    id: 'mapbox.streets'
// });


//////////////////////
// Create Leafvar map - this is the main object of this whole app... but where do I have to put this :-S
map = L.map('map',
    {
        dragging: false,
        // touchZoom: false,    // disable zooming on mobile
        // scrollWheelZoom: false,   // but not on PC
        doubleClickZoom: true,   // zoom on center, wherever you click
        fullscreenControl: true,
        markerZoomAnimation: false,
        layers: [liteLayer, darkLayer],
    }
);

console.log("Leafvar Map ready");

//////////////////////
//  MARKERS

// Prepare markers to use FontAwesome
L.ExtraMarkers.Icon.prototype.options.prefix = 'fa';

// the markers object keeps track of all markers (LOL)
// it's a dictionary that maps objectID to a marker [except for racers.. they use racer name (todo rework.. or not)]

function addRacerMarker(racer, options) {

    // racer object must contain following properties:
    //   name, lat, lng, color, icon
    console.log("Racer - "+racer.name+" "+racer.lat+" "+racer.lng);
    // create the L.marker
    var r = L.marker([racer.lat, racer.lng], {
        title: racer.name,
        draggable: true,
        zIndexOffset: 400
    });
    // var icon = L.divIcon({
    //     className: 'ship-icon',
    //     iconSize: [80,80],
    //     html: '<div><></div>'
    //
    //         racer.name,
    // });
    r.setIcon(shipIcon);
    r.bindTooltip(racer.name, {
        // permanent : true,
        direction: 'bottom',
        offset: [0,20]
    });
    r.pushLocation = function() {
        var pos = this.getLatLng();
        var data = {name: this.name, lat: pos.lat, lng: pos.lng};
        console.log('Outbox: '+JSON.stringify(data));
        socket.emit('move marker', data);
    };
    r.moveTo = function(newPos) {
        // Normalize the transition speed from vertex to vertex
        var speed = Math.min( this._latlng.distanceTo(newPos) * 200, 3000);
        
        // Only if CSS3 transitions are supported
        if (L.DomUtil.TRANSITION) {
          if (this._icon) { this._icon.style[L.DomUtil.TRANSITION] = ('all ' + speed + 'ms ease-in-out'); }
          if (this._shadow) { this._shadow.style[L.DomUtil.TRANSITION] = 'all ' + speed + 'ms ease-in-out'; }
        }
        this.setLatLng(newPos);
    };
    r.fadeOut = function() {
        if (L.DomUtil.TRANSITION) {
            var speed = 2000;
            if (this._icon) {
                this._icon.style[L.DomUtil.TRANSITION] = 'all ' + speed + 'ms linear';
            }
            if (this._shadow) {
                this._shadow.style[L.DomUtil.TRANSITION] = 'all ' + speed + 'ms linear';
            }
            this.setOpacity(0);
            return this;
        } else {
            return null;
        }
    };
    r.on('dragend', r.pushLocation);

    r.color = r.options.icon.options.color;
    r.name = r.options.title;
    markers[racer.id] = r.addTo(map);
    return r;
}

function addMainRacerMarker(racer, options)  {
    var r = addRacerMarker(racer, {shape: 'circle'});
    // always display the Main User on top
    r.setZIndexOffset(900);
    var DEFAULT_RANGE = 20;

    r.styles = {
        bombmodeEnabled: { color: '#2E2E2E', weight: 1, stroke: true,},
        default: { color: colormap[racer.color], weight: 2, stroke: true,},
    };

    // track all movement of the main racer
    r.mainUserTrack = [];
    r.mainUserTrackPolyLine = L.polyline(r.getLatLng(), r.styles.default).addTo(map);
    // add a Circle that shows the action range

    r.mainRange = L.circle(r.getLatLng(), DEFAULT_RANGE,
        r.styles.default
    ).addTo(map);

    r.onMove = function (e) {
        this.mainRange.setLatLng(e.latlng);
        this.mainUserTrack.push(e.latlng);    // this might get a bit fat in combination with dragging
        teamScore.update();
    };
    // this circle needs to follow the main marker at all time
    r.on('move', r.onMove);

    // add BombMode support
    // r.activateBombMode = (function(dropBomb, teardown) {
    //     this.mainRange.setRadius(DEFAULT_RANGE);
    //     this.mainRange.setStyle(this.styles.bombmodeEnabled);
    //     this.mainRange.once('click', dropBomb);
    // });
    //
    // r.deactivateBombMode = (function(){
    //     this.mainRange.setRadius(35);
    //     this.mainRange.setStyle(this.styles.default);
    //     this.mainRange.off('click');
    // });

    return r;
}

for (var i = 0 ; i < flaskData.racers.length; i++) {
    var racer = flaskData.racers[i];
    var ismainmarker = racer.name === flaskData.username;
    if (ismainmarker) {
        // setup the main central Racer
        markers[racer.id] = addMainRacerMarker(racer); // .addTo(map);
        mrm = markers[racer.id];
        mrmColor = racer.color;
        // bind to main Racer .. TODO: set this in global module settings
        console.log('We are team '+mrmColor);
        console.log(mrm);
        var sheet = document.getElementById('mystyle').sheet;
        sheet.insertRule('.leafvar-bar, .leafvar-touch .leafvar-bar {    ' +
            'border: 4px solid '+colormap[mrmColor]+';' +
            'background-color: '+colormap[mrmColor]+';' +
            '}', 1);
        console.log(sheet.cssRules);
    } else {
        // setup the other nearby Racers
        markers[racer.id] = addRacerMarker(racer); //.addTo(map);
    }
}


//console.log('mainsusermarker iconsize '+mrm.options.icon.options.iconSize);
//mrm.options.icon.options.iconSize = [50,50];

console.log("Racer Markers ready");

// incoming websocket events
socket.on('marker moved', function(data) {
    console.log("Inbox received:  MM");
    console.log("Inbox unpack..: "+data.name+" "+data.id+" "+data.lat+" "+data.lng);
    var marker = markers[data.id];
    if (marker) {
        if (marker.moveTo) {
            marker.moveTo([data.lat, data.lng]);
        } else {
            marker.setLatLng([data.lat, data.lng]);
        }

    } else {
        console.log("but marker not known before.. adding a new marker for "+data.id);
        if ('species' in data) {
            // Beast marker
            markers[data.id] = addBeastMarker(data);

        } else {
            // normal Racer marker
            markers[data.id] = addRacerMarker(data); //.addTo(map);
        }
    }
});

socket.on('marker added', function(data) {
    console.log("Inbox received:  M+");
    console.log("Inbox unpack..: "+data.name+" "+data.lat+" "+data.lng);
    var marker = markers[data.id];
    if (!marker){
        if ('species' in data) {
            // Beast marker
            markers[data.id] = addBeastMarker(data);
        } else {
            // normal Racer marker
            markers[data.id] = addRacerMarker(data); //.addTo(map);
        }
    } else {
        console.log('.. but we already had that marker')
    }

});

socket.on('marker removed', function(data) {
    console.log("Inbox received:  M-");
    console.log("Inbox unpack..: "+data.name);
    var marker = markers[data.id];
    if (marker) {
        if (marker.fadeOut()) {
            setTimeout(function(){
                map.removeLayer(marker);
                devare markers[data.id];
            }, 2000);
        } else {
            map.removeLayer(marker);
            devare markers[data.id];
        }
    } else {
        console.log('.. but we don\'t know that marker?')
    }
});





/////////////////
// FLAGS

// function addFlagMarker(flag) {
//     // var icon = L.ExtraMarkers.icon({
//     //     icon: 'fa-flag',
//     //     markerColor: flag.team,
//     //     shape: 'circle',
//     // });
//     var icon = L.divIcon({
//         className: 'flag-icon '+ flag.team,
//         iconSize: [58, 58],
//         //html:'<i class="fa fa-fw fa-2x fa-flag flag-icon"></i>'
//     });
//     var title = flag.team.charAt(0).toUpperCase() + flag.team.slice(1) + ' flag';
//     var marker = L.marker([flag.lat, flag.lng], {    // TODO: subclass
//         icon: icon,
//         title: title,
//         draggable: false,
//         //zIndexOffset: 50
//     });
//     marker.team = flag.team;
//
//     markers[flag.id] = marker.addTo(map);
// }
//
// for (var i = 0; i < flaskData.flags.length; i++) {
//     var flag = flaskData.flags[i];
//     addFlagMarker(flag);
//     // hide the carried flag - one of the racers has it!
//     if (flag.state == 'carried')
//         map.removeLayer(markers[flag.id]);
// }
//
// socket.on('flag added', function(data) {
//     console.log("Inbox received:  Flag Added");
//     console.log("Inbox unpack..: "+data.id+" - "+data.team+" flag");
//     var flag = markers[data.id];
//     if (flag) {
//         console.log(".. flag already existed");
//     } else {
//         addFlagMarker(data);
//     }
// });
//
// socket.on('flag grabbed', function(data) {
//     console.log("Inbox received:  Flag Grab");
//     console.log("Inbox unpack..: "+data.name+" grabbed "+data.target);
//     // set marker[data.name] icon to flag mode
//     var flag = markers[data.target];
//     if (flag) {
//         flag.setIcon(
//             L.divIcon({
//                 className: 'flag-icon base',
//                 iconSize: [58, 58],
//             })
//         );
//     }
// });
//
// socket.on('flag dropped', function(data) {
//     console.log("Inbox received:  Flag Drop");
//     console.log("Inbox unpack..: "+data.racername+" dropped "+data.target);
//     var flag = markers[data.target];
//     var racer = markers[data.racerid];
//     if (flag) {
//         // update position to drop site and add again to map
//         flag.setLatLng(racer.getLatLng()).addTo(map);
//         // TODO: set icon to dropped mode
//         // TODO: create icon dict.. no need to recreate all the time
//         // flag.setIcon()
//     }
// });
//
// socket.on('flag returned', function(data) {
//     console.log("Inbox received:  Flag Returned");
//     console.log("Inbox unpack..: "+data.name+" returned "+data.target+". Now back to "+data.lat+','+data.lng);
//     var flag = markers[data.target];
//     var pos = [data.lat, data.lng];
//     if (flag) {
//         // update position to base
//         flag.setLatLng(pos);
//         // set flag to base mode
//         flag.setIcon(
//             L.divIcon({
//                 className: 'flag-icon '+flag.team,
//                 iconSize: [58, 58],
//             })
//         );
//     }
// });
//
// socket.on('flag scored', function(data) {
//     console.log("Inbox received:  Flag Score");
//     console.log("Inbox unpack..: "+data.name+" scored "+data.target+". Now back to "+data.lat+','+data.lng);
//     var flag = markers[data.target];
//     var pos = [data.lat, data.lng];
//     if (flag) {
//         // update position to base
//         flag.setLatLng(pos).addTo(map);
//         // set flag to base mode
//         flag.setIcon(
//             L.divIcon({
//                 className: 'flag-icon '+flag.team,
//                 iconSize: [58, 58],
//             })
//         );
//     }
// });


//////////////////////
// COINS

function addCoinMarker(coin) {
    var title = coin.value+'p';
    var marker = L.marker([coin.lat, coin.lng], {
        title: title,
        zIndexOffset: 20
    });
    marker.bindTooltip(title, {direction:'bottom'});

    marker.setIcon(coinIcon);
    if (coin.id.slice(-1) === '0'){
        marker.setIcon(rumIcon);
        marker.bindPopup('Drink this and go catch a whale!');
    }
    markers[coin.id] = marker.addTo(map);
}

socket.on('coin added', function(coin) {
    console.log("Inbox received:  Coin Added");
    console.log("Inbox unpack..: "+coin.id+" - "+coin.value+"points coin");
    var marker = markers[coin.id];
    if (marker) {
        console.log(".. coin already existed");
    } else {
        addCoinMarker(coin);
    }
});

socket.on('coin pickup', function(coin) {
    console.log("Inbox received:  Coin Pickup");
    console.log("Inbox unpack..: "+coin.id+" - "+coin.value+"points coin");
    var marker = markers[coin.id];
    if (marker) {
        if (map.distance(marker.getLatLng(), mrm.getLatLng()) < 40) {
            // play the coin sound
            sounds.coin.play();

            // and buzz away
            if (navigator.vibrate) {
                navigator.vibrate([200]);
            }
        }
        // remove the coin from the map
        map.removeLayer(marker);
        devare markers[coin.id];
    } else {
        console.log(".. coin not found");
    }
});

if (mrm.name === 'admin'){
    // A button to Add a Coin to the map (TODO: admin only)
    var addCoinButton = L.easyButton( 'fa-diamond',   function() {
            var pos = mrm.getLatLng();
            var data = {'lat':pos.lat, 'lng':pos.lng};
            socket.emit('add coin', data);
        }
    ).addTo(map);

    map.on('keypress',  function listenToButtonC(e) {
        if (e.originalEvent.key == 'c')
            addCoinButton._currentState.onClick();
        }
    );
}




// BEASTS
var lastBeast = '58989eacf8ae2a7051122fca';
function addBeastMarker(beast) {
    var title = beast.name;
    var marker = L.marker([beast.lat, beast.lng], {
        autoStart: false,
        title: title,
        zIndexOffset: 990,
        interactive: false,
    });
    marker.setIcon(whaleIcon);
    marker.species = beast.species;
    // todo refactor
    if (beast.species === 'kraken'){
        marker.setIcon(krakenIcon);
    }
    marker.bindTooltip('blub', {direction:'top'});

    marker.moveTo = function(newPos) {
        // Normalize the transition speed from vertex to vertex
        var speed = Math.min( this._latlng.distanceTo(newPos) * 200, 3000);

        // Only if CSS3 transitions are supported
        if (L.DomUtil.TRANSITION) {
          if (this._icon) { this._icon.style[L.DomUtil.TRANSITION] = ('all ' + speed + 'ms ease-in-out'); }
          if (this._shadow) { this._shadow.style[L.DomUtil.TRANSITION] = 'all ' + speed + 'ms ease-in-out'; }
        }
        this.setLatLng(newPos);
    };
    marker.fadeOut = function() {
        if (L.DomUtil.TRANSITION) {
            var speed = 2000;
            if (this._icon) {
                this._icon.style[L.DomUtil.TRANSITION] = ('all ' + speed + 'ms linear');
            }
            if (this._shadow) {
                this._shadow.style[L.DomUtil.TRANSITION] = 'all ' + speed + 'ms linear';
            }
            this.setOpacity(0);
            return this;
        } else {
            return null;
        }
    };
    markers[beast.id] = marker.addTo(map);
    lastBeast = beast.id;
    return marker;
}

socket.on('beast hit', function(data){
    var marker = markers[data.beast];
    if (marker && marker.species){
        sounds[marker.species].play();
    } else {
        console.log('Play Sound fails for ', data);
    }
});

if (mrm.name === 'admin'){
    // A button to Add a Beast Stop to the map (TODO: admin only)
    var addBeastStopButton = L.easyButton( 'fa-ship',   function() {
        var pos = mrm.getLatLng();
        var data = {'lat':pos.lat, 'lng':pos.lng, 'id': lastBeast};
        console.log('Add Beast Stop for '+ lastBeast +' at '+pos);
        socket.emit('add beast stop', data);
    }).addTo(map);

    map.on('keypress',  function listenToButtonS(e) {
        if (e.originalEvent.key == 's')
            addBeastStopButton._currentState.onClick();
        }
    );
}






////////////////////////
//  BUTTONS

// A button to Add a Flag to the map (TODO: admin only)
// L.easyButton( 'fa-flag',   function() {
//         var pos = mrm.getLatLng();
//         var data = {'lat':pos.lat, 'lng':pos.lng, 'team': mrmColor};
//         socket.emit('add flag', data);
//     }
// ).addTo(map);




//////////////////////////
// LOCATION
//
//

/////////////////////
// prepare leafvar map.locate callback functions

// add button that searches your location
var locateBtn = L.easyButton({
    position: 'topleft',
    states : [
        {
            stateName: 'locator-disabled',
            icon: 'fa-crosshairs',
            onClick: function (btn, map) {
                // mrm.bindPopup("Enabled Locator").openPopup();

                console.log("Start using Leafvar Location");
                map.locate({
                    watch: true,                // keep tracking
                    enableHighAccuracy: true,   // enable GPS
                    timeout: 30000
                });
                btn.state('locator-enabled');
            }
        },
        {
            stateName: 'locator-enabled',
            icon: 'fa-times',
            onClick: function (btn, map) {
                // mrm.bindPopup("Disabled Locator").openPopup();

                console.log("Stop using Leafvar Location");
                map.stopLocate();
                btn.state('locator-disabled');
            }
        }
    ]
});

mrm.loctracker = {
    prevPos : 0,
    prevTime: 0
};

function onLocationFound(e) {
    //
    mrm.setLatLng(e.latlng);
    map.setView(e.latlng);

    // Store this point to the tracker
    mrm.mainUserTrack.push(e.latlng);

    if (e.latlng == mrm.loctracker.prevPos || e.timestamp < mrm.loctracker.prevTime + 1000){
        // do nothing
    } else {
        mrm.pushLocation();
        mrm.loctracker.prevPos = e.latlng;
        mrm.loctracker.prevTime = e.timestamp;
    }
}

function onLocationError() {
    // console.log("Sorry no location found");
    //map.setView(defaultPos, 13);
    setFreeGeoIP();
    // alert(e.message);
}

function setFreeGeoIP() {
    // use jquery ajax call to lookup the geolocation based on your ipaddress
    // max 10k requests per hour
    $.getJSON("https://freegeoip.net/json/",
        // when AJAX call is successful, run the following function
        function (data) {
            console.log("FreeGeoIP - "+data);
            console.log("FreeGeoIP setting mainMarker location");
            var pos = L.latLng(data.latitude, data.longitude);
            // add a marker on the location of the resolved GeoIP
            mrm.setLatLng(pos).bindPopup("Your GPS doesnt work yet..").openPopup();
            // update position on server
            mrm.pushLocation();
            // update the map
            map.setView(pos, 14);
        }
    );
}

// connect location events to callback functions
map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

console.log("Leafvar location callbacks ready.. setView to main marker");





///////////////////////////////////
/// BOMBS AWAAAAY
//-------------------------------//

// var bombButton = L.easyButton({
//     states : [
//         {
//             stateName: 'bombmode-off',
//             icon: 'fa-bomb',
//             onClick: function (btn) {
//                 this.setupBombMode(btn);
//             }
//         },
//         {
//             stateName: 'bombmode-on',
//             icon: 'fa-times',
//             onClick: function (btn) {
//                 this.teardownBombMode(btn);
//             }
//         }],
// });
//
// bombButton.dropBomb = function (e) {
//     console.log('Dropped a BOMB muhahaha');
//     var pos = e.latlng;
//     var data = {lat: pos.lat, lng: pos.lng,}; // range: 200};
//     socket.emit('add bomb', data);
//     bombButton.teardownBombMode();
// };
//
// bombButton.setupBombMode = function(control) {
//     mrm.activateBombMode(this.dropBomb);
//     map.dragging.disable();
//     map.touchZoom.disable();
//     control.state('bombmode-on');
// };
//
// bombButton.teardownBombMode = function(control){
//     //mrm.bindPopup("Disabled Bomb Mode").openPopup();
//     mrm.deactivateBombMode();
//     map.dragging.enable();
//     map.touchZoom.enable();
//     if (!control)  control = this;  // this is used after dropBomb
//     control.state('bombmode-off');
// };
//
// bombButton.addTo(map);
//
// map.on('keypress',  function listenToButtonB(e) {
//     if (e.originalEvent.key == 'b')
//         bombButton._currentState.onClick(bombButton, map);
//     }
// );
//
//
// function addBombMarker(bomb) {
//     var pos = (bomb.pos) ? bomb.pos : [bomb.lat, bomb.lng];
//     var marker = L.marker(pos, {
//         // icon: L.ExtraMarkers.icon({
//         //     icon: 'fa-bomb',
//         //     markerColor: 'black',  //json.team
//         //     shape: 'circle',
//         // })
//         icon: L.divIcon({
//             className: 'bomb-icon',
//             iconSize: [60,60],
//         })
//     }).addTo(map);
//     marker.bindPopup("BOOM");
//     markers[bomb.id] = marker;
// }
//
// socket.on('bomb added', function(bomb) {
//     console.log("Inbox received:  B+");
//     console.log("Inbox unpack..: "+bomb.lat+" "+bomb.lng);
//     var marker = markers[bomb.id];
//     if (!marker)
//         addBombMarker(bomb);
//     else
//         console.log('.. but we already had that marker')
// });
//
// socket.on('bomb exploded', function(bomb) {
//     console.log("Inbox received: BOOM");
//     console.log("Inbox unpack..: bomb "+bomb.id+" at "+bomb.lat+" "+bomb.lng+" R: "+bomb.range);
//
//     // get the bomb position
//     var latlng = [bomb.lat, bomb.lng];
//
//     // check if we have a bomb marker on the screen and remove it
//     var marker = markers[bomb.id];
//     if (marker) {
//         map.removeLayer(marker);
//         devare markers[bomb.id];
//     } else {
//         console.log('Oh... what was that');
//     }
//
//     // use a Leafvar Circle to get the proper size in meters (a marker doesn't follow scale)
//     var radius = 10;
//     var damageRange = L.circle( latlng, radius,
//             {
//                 interactive: false,
//                 stroke: true,
//                 color: '#2E2E2E',
//                 fillOpacity: 0.6,
//                 weight: 3,
//             }
//     ).addTo(map);
//
//     // make the circle grow in size to simulate an actual explosion
//     setTimeout( function(){
//         var id = setInterval(function(){
//             // bomb explosion radius is part of json data
//             radius += bomb.range / 10;
//             if (radius <= bomb.range) {
//                 damageRange.setRadius(radius);
//             } else if (radius > bomb.range * 6) {
//                 map.removeLayer(damageRange);
//                 clearInterval(id);
//             }
//         }, 40);
//     }, 10);
//
//     // play the bomb sound
//     sounds.bomb.play();
//
//     // and buzz away
//     if (navigator.vibrate) {
//         navigator.vibrate([100,100,200]);
//     }
// });


/////////////////////
// SHOW HELP button

// A button to Add a Coin to the map (TODO: admin only)
var helpButton = L.easyButton( 'fa-question',   function() {
    var helptext = "AARRRRR AHOI!!! " +
            "De achterdeur van mijn schip stond open en nu ben ik al mijn centjes verrrloren, verhip!"+ "<br/>" +
            "RRRRaap jij ze weer op, maatje?";
    var popup = mrm.unbindPopup();
    mrm.bindPopup(helptext).openPopup();
}).addTo(map);

helpButton._currentState.onClick();


///////////////////////////////
// SHOW TRACK button

L.easyButton('fa-bolt', function () {
    mrm.mainUserTrackPolyLine.setLatLngs(mrm.mainUserTrack);
    mrm.bindPopup("What a wild ride!").openPopup();
    setTimeout(function(){
        mrm.unbindPopup();
    }, 3000);
    if (navigator.vibrate) {
        // vibration API supported
        // vibrate twice
        navigator.vibrate([100, 100, 100]);
    }
}).addTo(map);
console.log("Easy Buttons ready");

// Layers
var layersControl = L.control.layers({'Light':liteLayer, 'Dark':darkLayer},{});
layersControl.addTo(map);


/////////////////////////////
// TEAM SCORE BOARD
teamScore = L.control({position: 'bottomright'});
teamScore.onAdd = function () {
    this._div = L.DomUtil.create('div', 'score-board'); // create a div with a class "score-board"
    this._scores={'red':0, 'green':0, 'blue':0};
    this._panels = {}
    for (var color in this._scores) {
        var panel = L.DomUtil.create('div', 'score-board-panel', this._div);
        L.DomUtil.addClass(panel, color);
        L.DomUtil.create('div', 'coin-icon', panel);
        this._panels[color] = panel;
    }
    this.update();
    return this._div;
};

// fills in the score panels with new data or cached data
teamScore.update = function (data) {
    for (var color in this._scores) {
        // update the score in the tracker
        if (data && data.team && data.team[color]) {
            this._scores[color] = data.team[color];
        }
        this._panels[color].innerHTML = this._scores[color];
    }
};
teamScore.addTo(map);

// the server sends 'new score' event with team and individual scores
socket.on('new score', function(data) {
    console.log("Inbox received:  T+");
    console.log("Inbox unpack..: "+data.team[mrmColor]+" "+data.individual[flaskData.username]);
    if(data && data.team){
        teamScore.update(data);
    }
});



/////////////////////
// DISTANCE TRACKER

var distanceTracker = L.control();
distanceTracker.onAdd = function() {
    this._div = L.DomUtil.create('div', 'distance-tracker');
    this.update();
    return this._div;
};
distanceTracker.update = function (props) {
    // calculate total distance travelled
    var track = mrm.mainUserTrack;
    var total = 0;
    for (var i=0; i<track.length-1; i++) {
        total += map.distance(track[i], track[i+1]);
    }
    var html = Math.round(total)+' m travelled';
    this._div.innerHTML = html;
};




////////////////
// FINALIZE INIT
//
map.setView(mrm.getLatLng(), 17);


if (mrm.name === 'admin'){
    locateBtn.addTo(map);
    map.dragging.enable();
} else {
    // force locator for others
    console.log("Start using Leafvar Location");
    map.locate({
        watch: true,                // keep tracking
        enableHighAccuracy: true,   // enable GPS
        timeout: 30000
    });
}
