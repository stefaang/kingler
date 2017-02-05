'use strict';

// show the setup data provided by the server
console.log(flaskData);
console.log(flaskData.racers[0]);

// globals
let map = null;
let mrm = {};
let mainUserTeamColor = null;
let markers = {};

let socket = null;

function inert(a) {
  return JSON.parse(JSON.stringify(a))
}

//
// WIP: put all this stuff in a module
//

class Dummy {
    constructor(name) {
        this.name = name;
    }
    printName() {
        console.log('Hello there, '+this.name)
    }
}
let d = new Dummy('derp');
d.printName();
console.log(d);

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
let bombSound = new Howl({
  src: ['static/sound/bomb.mp3']
});
let coinSound = new Howl({
  src: ['static/sound/coin.mp3']
});



//////////////////////
//  MARKERS

// Prepare markers to use FontAwesome
//L.ExtraMarkers.Icon.prototype.options.prefix = 'fa';

// the markers object keeps track of all markers (LOL)
// it's a dictionary that maps objectID to a marker [except for racers.. they use racer name (todo rework.. or not)]

class RacerMarker extends mapboxgl.Marker {
    constructor(racer, options){
        // racer object must contain following properties:
        //   name, lat, lng, color, icon
        console.log("Racer - "+racer.name+" "+racer.lat+" "+racer.lng);

        // create the element
        let el = document.createElement('div');
        el.className = 'ship-icon';
        // create the marker with this element
        super(el, {offset: [el.style.width/2, el.style.height/2]});
        }

    setup(racer) {
        this.name = racer.title;
        this.setLngLat([racer.lng, racer.lat])
        this._element.addEventListener('click', this.showRacerName);
        this._element.addEventListener('dragend', this.pushLocation);
        return this;
    }

    showRacerName() {
        let popup = this.getPopup();
        if (!popup) {
            this.setPopup(this.options.title).openPopup();
        } else {
            popup.setContent(this.options.title).openPopup();
        }
    }

    pushLocation() {
        console.log('puuuuuuush');
        console.log(this);
        let pos = this.getLngLat();
        let data = {name: this.name, lat: pos.lat, lng: pos.lng};
        console.log('Outbox: '+JSON.stringify(data));
        socket.emit('move marker', data);
    }

}


class MainRacerMarker extends RacerMarker {
    constructor(racer) {
        super(racer, {shape: 'circle'});
    }

    setup(racer) {
        super.setup(racer);
        // always display the Main User on top
        // this.setZIndexOffset(900);

        let colormap = {'red': '#A12F36', 'green': '#00934F', 'blue': '#0072B5'};
        this.styles = {
            bombmodeEnabled: { color: '#2E2E2E', weight: 1, stroke: true,},
            default: { color: colormap[racer.color], weight: 2, stroke: true,},
        };

        // track all movement of the main racer
        this.mainUserTrack = [];
        // this.mainUserTrackPolyLine = mapboxgl.polyline(this.getLngLat(), this.styles.default).addTo(map);
        // add a Circle that shows the action range

        // TODO: replace by element
        // this.mainRange = mapboxgl.circle(this.getLngLat(), 35,
        //     this.styles.default
        // ).addTo(map);
        this.mainRange = document.createElement('svg')

        // <svg height="100" width="100">
        //   <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
        // </svg>
        // this._element.


        this._element.addEventListener('move', function (e) {
            let lnglat = [e.coords.longitude, e.coords.latitude];
            this.mainRange.setLngLat(lnglat);
            this.mainUserTrack.push(lnglat);    // this might get a bit fat in combination with dragging
        });
        this._element.addEventListener('dragend', function() {
            teamScore.update()
        });
        return this;
    }

    // add BombMode support
    activateBombMode(dropBomb, teardown) {
        this.mainRange.setRadius(50);
        this.mainRange.setStyle(this.styles.bombmodeEnabled);
        this.mainRange.once('click', dropBomb);
    };

    deactivateBombMode(){
        this.mainRange.setRadius(35);
        this.mainRange.setStyle(this.styles.default);
        this.mainRange.off('click');
    }
}




/////////////////
// FLAGS

function addFlagMarker(flag) {
    // var icon = L.ExtraMarkers.icon({
    //     icon: 'fa-flag',
    //     markerColor: flag.team,
    //     shape: 'circle',
    // });
    let icon = L.divIcon({
        className: 'flag-icon '+ flag.team,
        iconSize: [58, 58],
        //html:'<i class="fa fa-fw fa-2x fa-flag flag-icon"></i>'
    });
    let title = flag.team.charAt(0).toUpperCase() + flag.team.slice(1) + ' flag';
    let marker = L.marker([flag.lat, flag.lng], {    // TODO: subclass
        icon: icon,
        title: title,
        draggable: false,
        //zIndexOffset: 50
    });
    marker.team = flag.team;

    markers[flag.id] = marker.addTo(map);
}

for (let i = 0; i < flaskData.flags.length; i++) {
    let flag = flaskData.flags[i];
    addFlagMarker(flag);
    // hide the carried flag - one of the racers has it!
    if (flag.state == 'carried')
        map.removeLayer(markers[flag.id]);
}

socket.on('flag added', function(data) {
    console.log("Inbox received:  Flag Added");
    console.log("Inbox unpack..: "+data.id+" - "+data.team+" flag");
    let flag = markers[data.id];
    if (flag) {
        console.log(".. flag already existed");
    } else {
        addFlagMarker(data);
    }
});

socket.on('flag grabbed', function(data) {
    console.log("Inbox received:  Flag Grab");
    console.log("Inbox unpack..: "+data.name+" grabbed "+data.target);
    // set marker[data.name] icon to flag mode
    let flag = markers[data.target];
    if (flag) {
        flag.setIcon(
            L.divIcon({
                className: 'flag-icon base',
                iconSize: [58, 58],
            })
        );
    }
});

socket.on('flag dropped', function(data) {
    console.log("Inbox received:  Flag Drop");
    console.log("Inbox unpack..: "+data.name+" dropped "+data.target);
    let flag = markers[data.target];
    let racer = markers[data.name];
    if (flag) {
        // update position to drop site and add again to map
        flag.setLngLat(racer.getLngLat()).addTo(map);
        // TODO: set icon to dropped mode
        // TODO: create icon dict.. no need to recreate all the time
        // flag.setIcon()
    }
});

socket.on('flag returned', function(data) {
    console.log("Inbox received:  Flag Returned");
    console.log("Inbox unpack..: "+data.name+" returned "+data.target+". Now back to "+data.lat+','+data.lng);
    let flag = markers[data.target];
    let pos = [data.lat, data.lng];
    if (flag) {
        // update position to base
        flag.setLngLat(pos);
        // set flag to base mode
        flag.setIcon(
            L.divIcon({
                className: 'flag-icon '+flag.team,
                iconSize: [58, 58],
            })
        );
    }
});

socket.on('flag scored', function(data) {
    console.log("Inbox received:  Flag Score");
    console.log("Inbox unpack..: "+data.name+" scored "+data.target+". Now back to "+data.lat+','+data.lng);
    let flag = markers[data.target];
    let pos = [data.lat, data.lng];
    if (flag) {
        // update position to base
        flag.setLngLat(pos).addTo(map);
        // set flag to base mode
        flag.setIcon(
            L.divIcon({
                className: 'flag-icon '+flag.team,
                iconSize: [58, 58],
            })
        );
    }
});


//////////////////////
// COINS

function addCoinMarker(coin) {
    // let icon = L.ExtraMarkers.icon({
    //     icon: 'fa-diamond',
    //     markerColor: 'orange',
    // });
    let icon = L.divIcon({
        className: 'coin-icon',
        iconSize: [60,60],
    });
    let title = 'Pacman COIN';
    let marker = L.marker([coin.lat, coin.lng], {
        icon: icon,
        title: title,
        zIndexOffset: 20
    }).on('click', function (e) {


    });
    markers[coin.id] = marker.addTo(map);
}

socket.on('coin added', function(data) {
    console.log("Inbox received:  Coin Added");
    console.log("Inbox unpack..: "+data.id+" - "+data.value+"points coin");
    let coin = markers[data.id];
    if (coin) {
        console.log(".. coin already existed");
    } else {
        addCoinMarker(data);
    }
});

socket.on('coin pickup', function(data) {
    console.log("Inbox received:  Coin Pickup");
    console.log("Inbox unpack..: "+data.id+" - "+data.value+"points coin");
    let coin = markers[data.id];
    if (coin) {
        if (map.distance(coin.getLngLat(), mrm.getLngLat()) < 40) {
            // play the coin sound
            coinSound.play();

            // and buzz away
            if (navigator.vibrate) {
                navigator.vibrate([200]);
            }
        }
        // remove the coin from the map
        map.removeLayer(coin);
        delete markers[data.id];
    } else {
        console.log(".. coin not found");
    }
});




////////////////////////
//  BUTTONS

// A button to Add a Flag to the map (TODO: admin only)
// L.easyButton( 'fa-flag',   function() {
//         let pos = mrm.getLngLat();
//         let data = {'lat':pos.lat, 'lng':pos.lng, 'team': mainUserTeamColor};
//         socket.emit('add flag', data);
//     }
// ).addTo(map);


// A button to Add a Coin to the map (TODO: admin only)
// let addCoinButton = L.easyButton( 'fa-diamond',   function() {
//         let pos = mrm.getLngLat();
//         let data = {'lat':pos.lat, 'lng':pos.lng};
//         socket.emit('add coin', data);
//     }
// ).addTo(map);
//
// map.on('keypress',  function listenToButtonC(e) {
//     if (e.originalEvent.key == 'c')
//         addCoinButton._currentState.onClick();
//     }
// );








///////////////////////////////////
/// BOMBS AWAAAAY
//-------------------------------//

// let bombButton = L.easyButton({
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
//     let pos = [e.coords.longitude, e.coords.latitude];
//     let data = {lat: pos.lat, lng: pos.lng,}; // range: 200};
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
// function addBombMarker(json) {
//     let pos = (json.pos) ? json.pos : [json.lat, json.lng];
//     let bomb = L.marker(pos, {
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
//     bomb.bindPopup("BOOM");
//     markers[json.id] = bomb;
// }

socket.on('bomb added', function(json) {
    console.log("Inbox received:  B+");
    console.log("Inbox unpack..: "+json.lat+" "+json.lng);
    let marker = markers[json.id];
    if (!marker)
        addBombMarker(json);
    else
        console.log('.. but we already had that marker')
});

socket.on('bomb exploded', function(json) {
    console.log("Inbox received: BOOM");
    console.log("Inbox unpack..: bomb "+json.id+" at "+json.lat+" "+json.lng+" R: "+json.range);

    // get the bomb position
    let pos = [json.lat, json.lng];

    // check if we have a bomb marker on the screen and remove it
    let marker = markers[json.id];
    if (marker) {
        console.log("You and I, we knew this was coming");
        map.removeLayer(marker);
        delete markers[json.id];
    } else {
        console.log('Oh... what was that');
    }

    // use a Leaflet Circle to get the proper size in meters (a marker doesn't follow scale)
    let radius = 10;
    let damageRange = L.circle( pos, radius,
            {
                interactive: false,
                stroke: true,
                color: '#2E2E2E',
                fillOpacity: 0.6,
                weight: 3,
            }
    ).addTo(map);

    // make the circle grow in size to simulate an actual explosion
    setTimeout( function(){
        let id = setInterval(function(){
            // bomb explosion radius is part of json data
            radius += json.range / 10;
            if (radius <= json.range) {
                damageRange.setRadius(radius);
            } else if (radius > json.range * 6) {
                map.removeLayer(damageRange);
                clearInterval(id);
            }
        }, 40);
    }, 10);

    // play the bomb sound
    bombSound.play();

    // and buzz away
    if (navigator.vibrate) {
        navigator.vibrate([100,100,200]);
    }
});



///////////////////////////////
// SHOW TRACK button

// L.easyButton('fa-bolt', function () {
//     mrm.mainUserTrackPolyLine.setLngLats(mrm.mainUserTrack);
//     mrm.bindPopup("Show track of this session").openPopup();
//     if (navigator.vibrate) {
//         // vibration API supported
//         // vibrate twice
//         navigator.vibrate([100, 100, 100]);
//     }
//
// }).addTo(map);
// console.log("Easy Buttons ready");


/////////////////////////////
// TEAM SCORE BOARD

class ScoreControl {
    onAdd(map) {
        this._map = map;
        this._div = document.createElement('div');
        this._div.className = 'score-board';
        this._div.textContent = 'Hello, world';
        this.update();
        return this._div;
    }

    update(props) {
        let html = '<h4>Team score</h4>';
        if (props && props.team) {
            for (let color in props.team) {
                html += '<i style="background:' + color + '"></i> ' + props.team[color] + ' points<br>';
            }
        }
        // calculate total distance travelled
        // let track = mrm.mainUserTrack;
        // let total = 0;
        // for (let i=0; i<track.length-1; i++) {
        //     total += map.distance(track[i], track[i+1]);
        // }
        // html += Math.round(total)+' m travelled'
        this._div.innerHTML = html;
    }

    onRemove() {
        this._div.parentNode.removeChild(this._div);
        this._map = undefined;
    }
}

socket.on('new score', function(data) {
    console.log("Inbox received:  T+");
    console.log("Inbox unpack..: "+data.team[mainUserTeamColor]+" "+data.individual[flaskData.username]);
    teamScore.update(data);
});







//////////////////////
// Create MapBox map - this is the main object of this whole app.
// map = L.map('map',
//     {
//         dragging: true,
//         // touchZoom: false,    // disable zooming on mobile
//         // scrollWheelZoom: false,   // but not on PC
//         doubleClickZoom: false,   // zoom on center, wherever you click
//         fullscreenControl: true,
//     }
// );


mapboxgl.accessToken = 'pk.eyJ1Ijoic3RlZmFhbmciLCJhIjoiY2l3ZGppeWJtMDA1MDJ5dW1nOGZwcnlyeSJ9.vGapFUQfn2vyM2RZv78-fw';
map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/stefaang/ciyirbvik00592rmjlg8gjc7n',
    center: [3.74, 51],
    zoom: 17,   // initial zoomlvl
});




let racerGeoJSON = {
    "type": "FeatureCollection",
    "features": [],
};

flaskData.racers.forEach( function(racer) {
    // check if it is the main user
    let r;
    if (racer.name === flaskData.username) {
        // setup the main central Racer
        r = new MainRacerMarker(racer);
    } else {
        // setup the other nearby Racers
        r = new RacerMarker(racer);
    }
    r.setup(racer);
    r.addTo(map);
    markers[racer.name] = r;
    // racerGeoJSON.features.push({
    //             "type": "Feature",
    //             "properties": {
    //                 "name": racer.name,
    //                 "team": racer.color,
    //                 "icon": 'ship',
    //             },
    //             "geometry": {
    //                 "type": "Point",
    //                 "coordinates": [racer.lng, racer.lat]
    //            }
    //         })
});

let coinGeoJSON = {
    "type": "FeatureCollection",
    "features": [],
};


map.on('load', function mapLoaded() {
    console.log("Map is loaded");

    // map.addSource('racers', {type: 'geojson', data: racerGeoJSON});
    //
    // map.addLayer({
    //     'id': 'racers',
    //     'type': 'symbol',
    //     'source': 'racers',
    //     'layout': {
    //         'icon-image' : '{icon}',
    //         'icon-size': 0.2,
    //     }
    // });

    console.log("Added racers layer ");
    // console.log(JSON.stringify(racerGeoJSON));

    map.addSource('coins', {type: 'geojson', data: coinGeoJSON});
    map.addLayer({
         'id': 'coins',
        'type': 'symbol',
        'source': 'coins',
        'layout': {
            'icon-image' : 'coin',
            'icon-size': 0.1,
        }
    });
    console.log("Added coins layer");


    map.addControl(new ScoreControl());



    //////////////////////////
    // LOCATION
    //
    //

    // add button that searches your location
    let geolocateControl = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true,
                timeout: 6000},
            watchPosition: true
        })

    map.addControl(geolocateControl);

    /////////////////////
    // prepare leaflet map.locate callback functions

    geolocateControl.prev = {
        prevPos : 0,
        prevTime: 0
    };

    function onLocationFound(e) {
        // unpack event data
        console.log(e);
        let lnglat = [e.coords.longitude, e.coords.latitude];
        let now = e.timestamp;
        mrm.setLngLat(lnglat);
        map.setCenter(lnglat);

        // Store this point to the tracker
        //mrm.mainUserTrack.push(lnglat);
        if (lnglat == geolocateControl.prev.prevPos || now < geolocateControl.prev.prevTime + 5000){
            // do nothing
        } else {
            mrm.pushLocation();
            geolocateControl.prev.prevPos = lnglat;
            geolocateControl.prev.prevTime = now;
        }
    }

    function onLocationError() {
        // console.log("Sorry no location found");
        //map.setView(defaultPos, 13);
        //setFreeGeoIP();
        alert(e.message);
    }

    // connect location events to callback functions
    geolocateControl.on('geolocate', onLocationFound);
    geolocateControl.on('error', onLocationError);

    console.log("Leaflet location callbacks ready.. setView to main marker");



    ////////////////
    // FINALIZE INIT
    //
    // let mrm = racerGeoJSON.features[0];
    map.setCenter(mrm.getLngLat());
    // map.setZoom(17);

    // incoming websocket events
    socket.on('marker moved', function(data) {
        console.log("Inbox received:  MM");
        console.log("Inbox unpack..: "+data.name+" "+data.lat+" "+data.lng);
        let marker = markers[data.name];
        if (marker) {
            marker.setLngLat([data.lng, data.lat]);
            // var point = map.latLngToLayerPoint(L.latLng(data.lat, data.lng))
            // var fx = new L.PosAnimation();
            // console.log("fx go run.."+fx);
            // fx.run(marker, point, 0.5);
        } else
            console.log("but marker not known before.. adding a new marker");
            markers[data.name] = new RacerMarker(data).addTo(map);
    });

    socket.on('marker added', function(data) {
        console.log("Inbox received:  M+");
        console.log("Inbox unpack..: "+data.name+" "+data.lat+" "+data.lng);
        let marker = markers[data.name];
        if (!marker){
            markers[data.name] = new RacerMarker(data).addTo(map);
        }
        else
            console.log('.. but we already had that marker')
    });

    socket.on('marker removed', function(data) {
        console.log("Inbox received:  M-");
        console.log("Inbox unpack..: "+data.name);
        let marker = markers[data.name];
        if (marker) {
            map.removeLayer(marker);
            delete markers[data.name];
        } else {
            console.log('.. but we don\'t know that marker?')
        }

    });
});

// bind to main Racer .. TODO: set this in global module settings
mrm = markers[flaskData.username];
// mainUserTeamColor = mrm.color;

