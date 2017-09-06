'use strict';

// show the setup data provided by the server

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

var moanSounds = new Howl({
    'src': ['static/sound/moans.mp3'],
    'sprite': {
        'its_him': [0, 1200],
        'hes_so_sexy': [1300, 2400],
        'yes_sir': [3800, 1500],
        'id_do_anything': [5300, 2000],
        'i_submit': [7400, 1900],
        'control_me': [9300, 1400],
        'please_sir': [11200, 1600],
        'ow_sir': [12800, 1400],
        'its_him2': [15700, 3700],
        'random_moaning1': [33200, 9700],
        'random_moaning2': [44700, 5400],
        'fake_laugh': [55300, 2900]
    }
});
// keep track of which sound to play next
moanSounds.index = 0;

function playRandomCoinSound() {
    // originally this was just sounds.coin.play();
    var moan = ['its_him', 'hes_so_sexy', 'yes_sir', 'id_do_anything', 'i_submit', 'control_me', 'please_sir', 'ow_sir',
            'its_him2', 'random_moaning1', 'random_moaning2', 'fake_laugh'][moanSounds.index];
    moanSounds.index = (moanSounds.index + 1) % 12;
    moanSounds.play(moan);
}

// Icon definitions
var icons = {
    'ship':     L.divIcon({className: 'pirate-icon ship',    iconSize: [80,80], iconAnchor: [40,65], }),
    'whale':    L.divIcon({className: 'pirate-icon whale',   iconSize: [120,120], }),
    'kraken':   L.divIcon({className: 'pirate-icon kraken',  iconSize: [120,120], }),
    'parrot':   L.divIcon({className: 'pirate-icon parrot',  iconSize: [80,80], }),
    'octopus':  L.divIcon({className: 'pirate-icon octopus', iconSize: [120,120], }),
    'coin':     L.divIcon({className: 'pirate-icon coin',    iconSize: [36,36], }),
    'chest':    L.divIcon({className: 'pirate-icon chest',   iconSize: [40,40], }),
    'letter':   L.divIcon({className: 'pirate-icon letter',  iconSize: [40,40], }),
    'star':     L.divIcon({className: 'pirate-icon star',    iconSize: [40,40], }),

    // 'rum':      L.divIcon({className: 'pirate-icon rum',     iconSize: [40,40], }),
    // 'bottle':   L.divIcon({className: 'pirate-icon bottle',  iconSize: [50,50], }),
    // 'spy':      L.divIcon({className: 'pirate-icon spy',     iconSize: [50,50], }),
    // 'leg':      L.divIcon({className: 'pirate-icon spy',     iconSize: [50,50], }),
    // 'hook':     L.divIcon({className: 'pirate-icon hook',    iconSize: [40,40], }),
    // 'helm':     L.divIcon({className: 'pirate-icon helm',    iconSize: [40,40], }),
    // 'map':      L.divIcon({className: 'pirate-icon map',     iconSize: [40,40], }),
    // 'anchor':   L.divIcon({className: 'pirate-icon anchor',  iconSize: [40,40], }),
    // 'barrel':   L.divIcon({className: 'pirate-icon barrel',  iconSize: [45,45], }),
    // 'sword':    L.divIcon({className: 'pirate-icon sword',   iconSize: [40,40], }),
    // 'sabre':    L.divIcon({className: 'pirate-icon sabre',   iconSize: [40,40], }),
    // 'compass':  L.divIcon({className: 'pirate-icon compass', iconSize: [50,50], }),
};



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

// Lite Pirate tileset by thunderforest. It's awesome but a bit heavy on data

var liteLayer = L.tileLayer('https://{s}.tile.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=ca05b2d9cffa483aac7a95fdfb8b7607', {
    attribution: 'Data © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, Maps © <a href="http://www.thunderforest.com">Thunderforest</a>',
    id: 'tf.pioneer',
});

// Dark (but not too dark) tileset by thunderforest. Would be 10/10 if labels were optional.

// var darkLayer = L.tileLayer('https://{s}.tile.thunderforest.com/transport-dark/{z}/{x}/{y}.png?apikey=ca05b2d9cffa483aac7a95fdfb8b7607', {
//     maxZoom: 18,
//     attribution: 'Thunderforest',
//     id: 'tf.pioneer',
// });

// Alternative tileset by thunderforest --> very detailed
//
//var forestLayer = L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=ca05b2d9cffa483aac7a95fdfb8b7607', {
//    maxZoom: 18,
//    attribution: 'Thunderforest',
// });

// My own custom tileset made with MapBox Studio - production only
var darkLayer = L.tileLayer('https://api.mapbox.com/styles/v1/stefaang/ciyirbvik00592rmjlg8gjc7n/tiles/256/'+
    '{z}/{x}/{y}?access_token=pk.eyJ1Ijoic3RlZmFhbmciLCJhIjoiY2l3ZGppeWJtMDA1MDJ5dW1nOGZwcnlyeSJ9.vGapFUQfn2vyM2RZv78-fw', {
    attribution: 'Mapdata © <a href="http://openstreetmap.org">OpenStreetMap</a>, ' +
                 'Imagery © <a href="http://mapbox.com">Mapbox</a>',
   id: 'stefaang.ciyirbvik00592rmjlg8gjc7n'
});

//////////////////////
// Create Leaflet map - this is the main object of this whole app... but where do I have to put this :-S
map = L.map('map',
    {
        dragging: false,
        // touchZoom: false,    // disable zooming on mobile
        // scrollWheelZoom: false,   // but not on PC
        doubleClickZoom: true,   // zoom on center, wherever you click
        fullscreenControl: true,
        markerZoomAnimation: false,
        layers: [darkLayer],
        minZoom: 15,
        maxZoom: 18,
    }
);

// SocketIO for realtime bidirectional messages between client and server
socket = io();
socket.on('connect', function() {
   socket.emit('derp event', {data: 'i am connecting hell yeah'});
   console.log("Websockets ready - connected");
});
console.log("Websockets initialized");



console.log("Leaflet Map ready");

//////////////////////
//  MARKERS

// Prepare markers to use FontAwesome
L.ExtraMarkers.Icon.prototype.options.prefix = 'fa';

// the markers object keeps track of all markers (LOL)
// it's a dictionary that maps objectID to a marker [except for racers.. they use racer name (todo rework.. or not)]

var MovingMarker = L.Marker.extend({
    moveTo: function(newLatLng) {
        // Only if CSS3 transitions are supported
        if (L.DomUtil.TRANSITION) {
            // Normalize the transition speed from vertex to vertex
            var speed = Math.min( this._latlng.distanceTo(newLatLng) * 200, 3000);
            if (this._icon) { this._icon.style[L.DomUtil.TRANSITION] = ('all ' + speed + 'ms ease-in-out'); }
            if (this._shadow) { this._shadow.style[L.DomUtil.TRANSITION] = 'all ' + speed + 'ms ease-in-out'; }
        }
        this.setLatLng(newLatLng);
    },

    fadeOut: function() {
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
    }
});

var RacerMarker = MovingMarker.extend({
    options: {
        draggable: false,
        zIndexOffset: 400,
        icon: icons.ship,
    },

    initialize: function(racer) {
        // racer object must contain following properties:
        //   id, name, lat, lng, color, icon
        console.log("Racer - "+racer.name+" "+racer.lat+" "+racer.lng);
        MovingMarker.prototype.initialize.call(this, [racer.lat, racer.lng]);

        this.options.title = racer.name;
        this.name = racer.name; // move this to options?
        this.id = racer.id;
        this.color = racer.color;

        this.bindTooltip(racer.name, {
            direction: 'bottom',
            offset: [0,20]
        });
    },

    mtype: 'racer',

    pushLocation: function() {
        var pos = this.getLatLng();
        var data = {name: this.name, lat: pos.lat, lng: pos.lng};
        console.log('Outbox: move marker '+JSON.stringify(data));
        socket.emit('move marker', data);
    },


});

// racer factory
function racerMarker(racer) {
    return new RacerMarker(racer);
}

var MainRacerMarker = RacerMarker.extend({
    options: {
        zIndexOffset: 900,
    },

    DEFAULT_RANGE: 20,

    initialize: function(racer) {
        RacerMarker.prototype.initialize.call(this, racer);

        // prepare for tracking
        this.mainUserTrack = [];
        this.styles.default.color = colormap[racer.color];
    },

    styles: {
        bombmodeEnabled: {color: '#2E2E2E', weight: 1, stroke: true,},
        default: {color: 'black', weight: 2, stroke: true,},
    },

    onAdd: function(map) {
        RacerMarker.prototype.onAdd.call(this, map);

        // add a Circle that shows the action range
        this.mainRange = L.circle(this._latlng, this.DEFAULT_RANGE, this.styles.default).addTo(map);

        // track all movement of the main racer
        this.mainUserTrackPolyLine = L.polyline(this._latlng, this.styles.default).addTo(map);

        // this circle needs to follow the main marker at all time
        this.on('move', this.onMove);

        this.on('popupclose', function (p) {
            this.unbindPopup();
            map.locate({
                watch: true,                // keep tracking
                enableHighAccuracy: true,   // enable GPS
                timeout: 30000
            });
        })
    },

    onMove: function (e) {
        this.mainRange.setLatLng(this._latlng);
        // this.mainUserTrack.push(e.latlng);    // this might get a bit fat in combination with dragging
        if (this._distanceTracker) {
            this._distanceTracker.update();
        }
    },

    // add BombMode support
    // activateBombMode: function(dropBomb, teardown) {
    //     this.mainRange.setRadius(DEFAULT_RANGE);
    //     this.mainRange.setStyle(this.styles.bombmodeEnabled);
    //     this.mainRange.once('click', dropBomb);
    // },
    //
    // deactivateBombMode: function(){
    //     this.mainRange.setRadius(35);
    //     this.mainRange.setStyle(this.styles.default);
    //     this.mainRange.off('click');
    // };
});

// mainracer factory
function mainRacerMarker(racer) {
    return new MainRacerMarker(racer);
}


// todo: get mrm from socket

for (var i = 0 ; i < flaskData.racers.length; i++) {
    var racer = flaskData.racers[i];
    var ismainmarker = racer.name === flaskData.username;
    if (ismainmarker) {
        // setup the main central Racer
        console.log('Adding '+JSON.stringify(racer))
        markers[racer.id] = mainRacerMarker(racer).addTo(map);
        mrm = markers[racer.id];
        mrmColor = racer.color;
        // bind to main Racer .. TODO: set this in global module settings
        console.log('We are team '+mrmColor);
        console.log(mrm);
        var sheet = document.getElementById('mystyle').sheet;
        sheet.insertRule('.leaflet-bar, .leaflet-touch .leaflet-bar {    ' +
            'border: 4px solid '+colormap[mrmColor]+';' +
            'background-color: '+colormap[mrmColor]+';' +
            '}', 1);
        // console.log(sheet.cssRules);
    } else {
        // setup the other nearby Racers
        markers[racer.id] = racerMarker(racer).addTo(map);
    }
}


//console.log('mainsusermarker iconsize '+mrm.options.icon.options.iconSize);
//mrm.options.icon.options.iconSize = [50,50];

console.log("Racer Markers ready");

// incoming websocket events
socket.on('marker moved', function(data) {
    console.log("Inbox received:  MM");
    console.log("Inbox unpack..: "+data.name+" "+data.id+" "+data.lat+" "+data.lng);
    if (!markers) return;
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
            markers[data.id] = beastMarker(data).addTo(map);
        } else {
            // normal Racer marker
            markers[data.id] = racerMarker(data).addTo(map);
        }
    }
});

socket.on('marker added', function(data) {
    console.log("Inbox received:  M+");
    console.log("Inbox unpack..: "+data.name+" "+data.lat+" "+data.lng);
    if (!markers) return;
    var marker = markers[data.id];

    if (!marker){
        if ('species' in data) {
            // Beast marker
            markers[data.id] = beastMarker(data).addTo(map);
        } else {
            // normal Racer marker
            markers[data.id] = racerMarker(data).addTo(map);
        }
    } else {
        console.log('.. but we already had that marker')
    }

});

socket.on('marker removed', function(data) {
    console.log("Inbox received:  M-");
    console.log("Inbox unpack..: "+data.name);
    if (!markers) return;
    var marker = markers[data.id];
    if (marker) {
        if (marker.fadeOut()) {
            setTimeout(function(){
                map.removeLayer(marker);
                delete markers[data.id];
            }, 2000);
        } else {
            map.removeLayer(marker);
            delete markers[data.id];
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

var CoinMarker = L.Marker.extend({
    options: {
        zIndexOffset: 20,
        icon: icons.coin,
    },

    initialize: function(coin) {
        L.Marker.prototype.initialize.call(this, [coin.lat, coin.lng]);
        // L.setOptions(this, options);
        this.options.title = coin.icon;
        this.id = coin.id;

        if (coin.icon){
            this.setupIcon(coin.icon)
        }
    },

    setupIcon: function(icon) {
        this.bindTooltip(icon, {direction:'bottom', offset:[0,20]});
        if (icon in icons) {
            //
            if (icon == 'coin') {

            }
            this.setIcon(icons[icon]);
        } else {
            console.warn('icon missing!! ' + icon);
        }
    },

    mtype: 'coin',
});

// coin factory
function coinMarker(coin) {
    return new CoinMarker(coin);
}

var BabeMarker = CoinMarker.extend({
    setupIcon: function(icon) {
        // TODO: setup random babe
        this.bindTooltip(icon, {direction:'bottom', offset:[0,20]});
        if (icon in icons) {
            //
            if (icon == 'coin') {

            }
            this.setIcon(icons[icon]);
        } else {
            console.warn('icon missing!! ' + icon);
        }
    }
});

function babeMarker(babe) {
    return new BabeMarker(babe);
}

socket.on('coin added', function(coin) {
    console.log("Inbox received:  Coin Added");
    console.log("Inbox unpack..: "+coin.id+" - "+coin.icon+" coin");
    if (!markers) return;
    var marker = markers[coin.id];
    for ( var v in markers){
        console.log("DBG - " + v);
    }

    if (marker) {
        console.log(".. coin already existed");
    } else {
        markers[coin.id] = coinMarker(coin).addTo(map);
    }
});

socket.on('coin pickup', function(coin) {
    console.log("Inbox received:  Coin Pickup");
    console.log("Inbox unpack..: "+coin.id+" - "+coin.value+"points coin");
    if (!markers) return;

    var marker = markers[coin.id];
    if (marker) {
        if (mrm.id === coin.racer) {
            // play the coin sound
            playRandomCoinSound();

            // some coins have a secret bonus code
            if (coin.secret && secretControl) {
                secretControl.setSecretCoin(coin.id);
                secretControl.addTo(map);
                // you have 5 minutes to find the secret
                setTimeout(secretControl.remove, 300000);
            } else {
                secretControl.remove();
            }

            // invincible mode
            if (coin.invincible) {
                sounds.invincible.play();
            }

            // and buzz away
            if (navigator.vibrate) {
                navigator.vibrate([200]);
            }
        }
        // remove the coin from the map
        map.removeLayer(marker);
        delete markers[coin.id];
    } else {
        console.log(".. coin not found");
    }
});

socket.on('secret correct', function(data) {
    // play 3x ping
    console.log('SECRET IS CORRECT wooooooohooooo');
    sounds.coin.loop(1);
    sounds.coin.play();
    setTimeout(function() {
        sounds.coin.loop(0);
    }, 3000);
});




// BEASTS
var BeastMarker = MovingMarker.extend({
    options: {
        zIndexOffset: 990,
        interactive: false,
        icon: icons.whale,
    },

    initialize: function(beast) {
        L.Marker.prototype.initialize.call(this, [beast.lat, beast.lng]);
        // L.setOptions(this, options);

        this.species = beast.species;
        this.id = beast.id;
        if (beast.species in icons) {
            this.setIcon(icons[beast.species]);
        }
    },

    mtype: 'beast',
});

// beast factory
function beastMarker(beast) {
    return new BeastMarker(beast);
}

socket.on('beast hit', function(data){
    if (!markers) return;
    var marker = markers[data.beast];
    if (marker && marker.species && marker.species in sounds){
        sounds[marker.species].play();
    } else {
        console.log('Play Sound fails for ', data);
    }
});


////////////////////////
//  Location Tracking

mrm.loctracker = {
    prevPos : 0,
    prevTime: 0
};

function onLocationFound(e) {
    //
    mrm.setLatLng(e.latlng);
    map.setView(e.latlng);

    // Store this point to the tracker
    // mrm.mainUserTrack.push(e.latlng);

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

console.log("Leaflet location callbacks ready..");





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
//         delete markers[bomb.id];
//     } else {
//         console.log('Oh... what was that');
//     }
//
//     // use a Leaflet Circle to get the proper size in meters (a marker doesn't follow scale)
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

// The button to show the tutorial again
var helpButton = new L.easyButton( 'fa-question',   function() {
    if (mrm.getPopup()) {
        mrm.closePopup();
        mrm.unbindPopup();
    }
    map.stopLocate();
    // todo: move this to HTML
    var helptext = "<div><i class='pirate-icon coin'><b>AARRRRR AHOI!!! </b><br/>" +
            "De achterdeur van mijn schip stond open en nu ben ik al mijn centjes verrrloren, verhip!"+ "<br/>" +
            "Raap jij ze weer op, maatje? <br/>" +
            "Pas wel op voor de walvissen en zo. Ze bijten ferrrrrm. <br/>" +
            "Pro-tip: zet de helderheid van je scherm wat zachter en de slaapstand op 30 minuten.. " +
            "je scherm moet blijven aanstaan! En zet volume op max voor de beste ervaring muahahhaha</div>";
    mrm.bindPopup(helptext, {maxWidth:200, offset:[0,-20]}).openPopup();

}).addTo(map);

helpButton._currentState.onClick();


///////////////////////////////
// SHOW TRACK button

// L.easyButton('fa-bolt', function () {
//     mrm.mainUserTrackPolyLine.setLatLngs(mrm.mainUserTrack);
//     mrm.bindPopup("What a wild ride!").openPopup();
//     setTimeout(function(){
//         mrm.unbindPopup();
//     }, 3000);
//     if (navigator.vibrate) {
//         // vibration API supported
//         // vibrate twice
//         navigator.vibrate([100, 100, 100]);
//     }
// }).addTo(map);
console.log("Easy Buttons ready");

// Layers
var layersControl = L.control.layers({'Night':darkLayer, 'Day':liteLayer},{});
layersControl.addTo(map);


/////////////////////////////
// TEAM SCORE BOARD
var ScoreControl = L.Control.extend({
    options: {position: 'bottomright'},

    onAdd: function () {
        this._div = L.DomUtil.create('div', 'score-board'); // create a div with a class "score-board"
        this._scores={'red':0, 'green':0, 'blue':0};
        this._panels = {};
        for (var color in this._scores) {
            var panel = L.DomUtil.create('div', 'score-board-panel', this._div);
            L.DomUtil.addClass(panel, color);
            var coin = L.DomUtil.create('div', 'pirate-icon coin', panel);
            // set coin size?
            this._panels[color] = panel;
        }
        this.update();
        socket.emit('get scores');
        return this._div;
    },

    // fills in the score panels with new data or cached data
    update: function (data) {
        for (var color in this._scores) {
            // update the score in the tracker
            if (data && data.team && data.team[color]) {
                this._scores[color] = data.team[color];
            }
            this._panels[color].innerHTML = this._scores[color];
        }
    }
});
var teamScore = new ScoreControl();
teamScore.addTo(map);

// the server sends 'new score' event with team and individual scores
socket.on('new score', function(data) {
    console.log("Inbox received:  T+");
    console.log("Inbox unpack..: "+data.team[mrmColor]+" "+data.individual[flaskData.username]);

    if(data && data.team){
        teamScore.update(data);
    }
});


//////////////////////////
// SECRET CODE Control
// some coins come with a code for bonus points!
var SecretControl = L.Control.extend({
    options: {
        position: 'bottomright'
    },

    onAdd : function(map) {
        this._div = L.DomUtil.create('div', 'score-board');
        L.DomEvent.disableClickPropagation(this._div);
        this._answer = L.DomUtil.create('input', 'secret-input', this._div);
        this._answer.setAttribute('type','text');
        this._answer.setAttribute('name','secret');
        this._answer.setAttribute('id', 'secretAnswer');
        this._answer.setAttribute('value', '');
        L.DomEvent.addListener(this._answer, 'keypress', this.validateSecret, this);    // pass this to get access to _coin
        return this._div;
    },

    validateSecret: function(e) {
        console.log('typing...'+this._coin);
        // send secret to server and hide this
        if (e.keyCode==13 && this._coin) {
            var input = e.target;
            console.log('Submitting secret: '+input.value+' key: "'+e.keyCode+'"');
            var data = {'secret': input.value, 'coin_id': this._coin, 'racer_id': mrm.id, 'kc': e.keyCode};
            socket.emit('post secret', data);
            this.remove();
        }
    },

    setSecretCoin: function(coin) {
        // save the coin id of the last coin picked up
        this._coin = coin;
    }

});
var secretControl = new SecretControl();






/////////////////////
// DISTANCE TRACKER

// var distanceTracker = L.control();
// distanceTracker.onAdd = function() {
//     this._div = L.DomUtil.create('div', 'distance-tracker');
//     this.update();
//     return this._div;
// };
// distanceTracker.update = function() {
//     // calculate total distance travelled
//     var track = mrm.mainUserTrack;
//     var total = 0;
//     for (var i=0; i<track.length-1; i++) {
//         total += map.distance(track[i], track[i+1]);
//     }
//     this._div.innerHTML = Math.round(total)+' m travelled';
// };


/////////////////////
// LOGOFF button

// A button to log out
var logoutButton = L.easyButton( 'fa-times',   function() {
    document.location.href = './logout';
}).addTo(map, {location: 'bottomleft'});


////////////////
// FINALIZE INIT
//
map.setView(mrm.getLatLng(), 17);
if (mrm.getPopup()) {
    mrm.closePopup();
    mrm.unbindPopup();
}
