'use strict';

// show the setup data provided by the server
console.log('Flaskdata:');
console.log(flaskData);
console.log('Flaskdata.racer[0]:');
console.log(flaskData.racers[0]);

// globals
let map = null;
let mrm = null;
let mainUserTeamColor = null;
let markers = {};

let socket = null;

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
let bombSound = new Howl({
  src: ['static/sound/bomb.mp3']
});
let coinSound = new Howl({
  src: ['static/sound/coin.mp3']
});



//////////////////////
//  MARKERS
//
// Prepare markers to use FontAwesome
//L.ExtraMarkers.Icon.prototype.options.prefix = 'fa';
//
// the markers object keeps track of all markers (LOL)
// it's a dictionary that maps objectID to a marker [except for racers.. they use racer name (todo rework.. or not)]

class RacerMarker extends mapboxgl.Marker {
    constructor(racer, options){
        // racer object must contain following properties:
        //   name, lat, lng, color, icon
        console.log("Racer - "+racer.name+" "+racer.lat+" "+racer.lng);

        // create the element
        let el = document.createElement('div');
        let ic = document.createElement('div');  // icon
        $(ic).addClass('ship-icon')
            .html('')
            .appendTo($(el));    // add to main element

        // create the marker with this element
        super(el, {offset: [el.style.width/2, el.style.height/2]});
        this.icon = ic;
    }

    setup(racer) {
        console.log('setup '+racer.name+' '+racer.id);
        this.id = racer.id;
        this.name = racer.name;
        this.setLngLat([racer.lng, racer.lat]);
        $(this)
            .bind('click', this.showRacerName)
            .bind('dragend', this.pushLocation);
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
        console.log('puuuuuuush '+this.name);
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
        // $(this.icon).html('<svg height="100" width="100"> \
        //   <circle cx="50" cy="50" r="40" stroke="black" stroke-width="2" fill="'+colormap[racer.color]+'" opacity=".6" stroke-opacity=".6"/> \
        // </svg>')

        this._element.addEventListener('move', function (e) {
            let lnglat = [e.coords.longitude, e.coords.latitude];
            // this.mainRange.setLngLat(lnglat);
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
    // classic style
    // let coin = markers[data.id];
    // if (coin) {
    //     console.log(".. coin already existed");
    // } else {
    //     addCoinMarker(data);
    // }
    // fancy style
    if (data && data.id) {
        let coin = new Coin(data).addTo(map);
        markers[data.id] = coin;
    };
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
//
// A button to Add a Flag to the map (TODO: admin only)
// L.easyButton( 'fa-flag',   function() {
//         let pos = mrm.getLngLat();
//         let data = {'lat':pos.lat, 'lng':pos.lng, 'team': mainUserTeamColor};
//         socket.emit('add flag', data);
//     }
// ).addTo(map);
//
//
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
//
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
//
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


class MyGeolocateControl extends mapboxgl.GeolocateControl {
    // override the onSuccess method to disable the zoom, bearing and pitch reset
    _onSuccess(position) {
        this._map.jumpTo({
            center: [position.coords.longitude, position.coords.latitude],
        });

        this.fire('geolocate', position);
        this._finish();
    }
}




//////////////////////
// Create MapBox map - this is the main object of this whole app.

mapboxgl.accessToken = 'pk.eyJ1Ijoic3RlZmFhbmciLCJhIjoiY2l3ZGppeWJtMDA1MDJ5dW1nOGZwcnlyeSJ9.vGapFUQfn2vyM2RZv78-fw';
map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/stefaang/ciyirbvik00592rmjlg8gjc7n',
    center: [3.866, 51],
    zoom: 13,   // initial zoomlvl
    // pitch: 60,
    // bearing: 60,
});
map.dragPan.disable();


// setup dragging
let canvas = map.getCanvasContainer();
let isDragging = false;
let isCursorOverPoint = false;

class MapObject {
    constructor (o) {
        this.id = o.id;
        this._lngLat = [o.lng, o.lat];
    }

    get lng() { return this.getLngLat()[0]}
    get lat() { return this.getLngLat()[1];}
    getLngLat() { return this._lngLat}

    get geojson() {return MapObject.geojson}

    addTo(map) {
        this._addToGeoJSON();
        this._map = map;
        return this;
    }

    _addToGeoJSON() {
        this._geoindex = this.geojson.features.length;
        this.geojson.features.push(this.asFeature());
    }

    remove() {
        this._map = null;
        if (this._geoindex < Racer.geojson.features.length){
            Racer.geojson.features.splice(this._geoindex, 1);
            this._map.getSource('racers').setData(Racer.geojson);
        } else {
            console.log('Failed to remove coin. Geo index too high.');
        }
    }
}
MapObject.geojson = {
    features: [],
    type: 'FeatureCollection'
};

class Racer extends MapObject {
    // class that adds some functions to manage racers on the client
    constructor (racer){
        super(racer);
        this.id = racer.id;
        this.name = racer.name;
        this.icon = racer.icon;
        this._lngLat = [racer.lng, racer.lat];
        this.type = 'racer';
    }
    get geojson() {return Racer.geojson}

    setLngLat(lngLat) {
        if (typeof lngLat === 'object') {
            lngLat = [lngLat.lng, lngLat.lat];
        }
        this._lngLat = lngLat;
        this._update();
    }

    _update() {
        let map = this._map;
        if (!map || !Racer.geojson) {
            return;
        }
        // todo: use asFeature to get all updates
        Racer.geojson.features[this._geoindex].geometry.coordinates = this._lngLat;
        map.getSource('racers').setData(Racer.geojson);
        return;
    }

    _addToGeoJSON() {
        this._geoindex = Racer.geojson.features.length;
        Racer.geojson.features.push(this.asFeature());
    }

    addTo(map) {
        this._addToGeoJSON();
        this._map = map;
        return this;
    }

    remove() {
        this._map = null;
        if (this._geoindex < Racer.geojson.features.length){
            Racer.geojson.features.splice(this._geoindex, 1);
            this._map.getSource('racers').setData(Racer.geojson);
        } else {
            console.log('Failed to remove coin. Geo index too high.');
        }
    }

    asFeature() {
        return Racer.createFeature(self);
    }

    static createFeature(racer) {
        return {
            "type": "Feature",
            "properties": {
                "id": racer.id,
                "name": racer.name || 'nobody',
                "team": racer.color || 'black',
                "icon": racer.icon || 'ship',
            },
            "geometry": {
                "type": "Point",
                "coordinates": [racer.lng, racer.lat]
           }
        }
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
        console.log('puuuuuuush '+this.name);
        let data = {name: this.name, lat: this.lat, lng: this.lng};
        console.log('Outbox: '+JSON.stringify(data));
        socket.emit('move marker', data);
    }
}

// static object that tracks all Racers, usable as mapboxgl source
Racer.geojson = {
    "type": "FeatureCollection",
    "features": [],
};


class MainRacer extends Racer {
    // singular class to manage the main racer
    constructor (racer) {
        super(racer);
        this._map = null;
        this._canvas = null;
        this._isDragging = false;
        this._isCursorOverPoint = false;
    }

    _addToGeoJSON() {
        super._addToGeoJSON();
        MainRacer.geojson.features.push(this.asFeature());
    }

    addTo(map) {
        super.addTo(map);
        this._canvas = map.getCanvasContainer();
        return this;
    }


    setLngLat(lngLat) {
        if(!typeof lngLat === 'list') {
            lngLat = [lngLat.lng, lngLat.lat];
        }
        super.setLngLat(lngLat);
        MainRacer.geojson.features[0].geometry.coordinates = lngLat;
        this._map.getSource('mrm').setData(MainRacer.geojson);
    }

    get isCursorOverPoint() { return this._isCursorOverPoint;}

    set isCursorOverPoint(b) { this._isCursorOverPoint = b;}

    get isDragging() {return this._isDragging;}
    set isDragging(b) {this._isDragging = b;}

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
MainRacer.geojson = {
    "type": "FeatureCollection",
    "features": [],
};
MainRacer.rangejson = {
    "type": "FeatureCollection",
    "features": [],
};


class Coin extends MapObject {
    constructor (coin) {
        super(coin);
        this.id = coin.id;
        this.name = coin.name;
        this.icon = coin.icon;
        this.lngLat = [coin.lng, coin.lat];
        this.type = 'coin';
    }
    get geojson() {return Coin.geojson}

    get lng() { return this.lngLat[0]}
    get lat() { return this.lngLat[1];}

    addTo(map) {
        this._map = map;
        this._addToGeoJSON();
        map.getSource('coins').setData(Coin.geojson);
        console.log(Coin.geojson);
    }

    remove() {
        this._map = null;
        if (this._geoindex < Coin.geojson.features.length){
            Coin.geojson.features.splice(this._geoindex, 1);
            this._map.getSource('coins').setData(Coin.geojson);
        } else {
            console.log('Failed to remove coin. Geo index too high.');
        }
    }

    asFeature() {
        return Coin.createFeature(this);
    }

    static createFeature(coin) {
        return {
            "type": "Feature",
            "properties": {
                "id": coin.id,
                "value": coin.value,
                "icon": coin.icon
            },
            "geometry": {
                "type": "Point",
                "coordinates": [coin.lng, coin.lat]
           }
        }
    }
}
Coin.geojson = {
    "type": "FeatureCollection",
    "features": [],
};

console.log('setup racers');
flaskData.racers.forEach(function(racer) {
    if (racer.name === flaskData.username) {
        console.log('create mrm racer');
        markers[racer.id] = new MainRacer(racer).addTo(map);
        mrm = markers[racer.id];
        console.log('mrm racer created');
    } else {
        console.log('create racer');
        markers[racer.id] = new Racer(racer).addTo(map);
        console.log('racer created');
    }
});

console.log('setup racers done');

map.on('load', function mapLoaded() {
    console.log("Map is loaded");

    // get the racers
    console.log(JSON.stringify(Racer.geojson));

    map.addSource('racers', {'type': 'geojson', 'data': Racer.geojson});
    console.log('Added racers source');
    console.log(map.getSource('racers'));
    console.log('Racer loaded? '+map.isSourceLoaded('racers'));

    map.addSource('mrm', {'type': 'geojson', 'data': MainRacer.geojson});

    const mrmradius = 150;
    const metersToPixelsAtMaxZoom = (meters, latitude) => meters / 0.075 / Math.cos(latitude * Math.PI / 180);
    map.addLayer({
        'id': 'mrm-range',
        'source': 'mrm',
        'type': 'circle',
        'paint': {
            'circle-radius': {
                stops: [
                    [0, 1],
                    [20, metersToPixelsAtMaxZoom(mrmradius, mrm.lat)]
                ],
                base: 2
            },
            'circle-color': "rgba(20, 30, 230, 0.2)",
            'circle-stroke-opacity': 1
        }
    });
    console.log('Added mrm');

    map.addLayer({
        'id': 'racers',
        'source': 'racers',
        'type': 'symbol',
        'layout': {
            'icon-image' : 'ship',
            'icon-size': 0.2,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "text-allow-overlap": true,
            "text-optional": true,
        },
        // 'sprite': 'static/img/flaticons/pirates'
    });
    console.log("Added racers layer ");
    console.log(map.getLayer('racers'));

    // map.addSource('coins', {'type': 'geojson', 'data': Coin.createGeoJSON([])});
    // map.addLayer({
    //      'id': 'coins',
    //     'source': 'coins',
    //     'type': 'symbol',
    //     'layout': {
    //         'icon-image' : 'coin',
    //         'icon-size': 0.1,
    //     },
    //     'sprite': 'static/img/flaticons/pirates'
    // });
    // console.log("Added coins layer");

    // Add score board control
    map.addControl(new ScoreControl());

    map.addControl(new mapboxgl.NavigationControl());

    //////////////////////////
    // LOCATION
    //

    // add button that searches your location
    let geolocateControl = new MyGeolocateControl({
        positionOptions: {
            enableHighAccuracy: true,
            //timeout: 800
        },
        watchPosition: true
    });

    map.addControl(geolocateControl);
    console.log('Added controls');

    /////////////////////
    // prepare leaflet map.locate callback functions

    geolocateControl.prev = {
        prevPos : 0,
        prevTime: 0
    };

    function onLocationFound(e) {
        // unpack event data
        if (!mrm || !e.coords) {
            return
        }
        let lnglat = [e.coords.longitude, e.coords.latitude];
        let now = e.timestamp;
        mrm.setLngLat(lnglat);
        map.setCenter(lnglat);
        console.log('set map center! '+lnglat);

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

    function onLocationError(e) {
        // console.log("Sorry no location found");
        //map.setView(defaultPos, 13);
        //setFreeGeoIP();
        //alert(e.message);
    }

    // connect location events to callback functions
    geolocateControl.on('geolocate', onLocationFound);
    geolocateControl.on('error', onLocationError);

    console.log("Leaflet location callbacks ready.. setView to main marker");

    ////////////////
    // FINALIZE INIT
    //
    // let mrm = racerGeoJSON.features[0];
    console.log('finalizzzze');
    console.log(mrm.getLngLat());
    map.setCenter(mrm.getLngLat());
    console.log('Set map center');
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

    // If a feature is found on map movement,
    // set a flag to permit a mousedown events.
    map.on('mousemove', function(e) {
        let features = map.queryRenderedFeatures(e.point, { layers: ['mrm-range'] });
        let canvas = map.getCanvasContainer();
        // Change point and cursor style as a UI indicator
        // and set a flag to enable other mouse events.
        if (features.length) {
            map.setPaintProperty('mrm-range', 'circle-color', '#3bb2d0');
            canvas.style.cursor = 'move';
            mrm.isCursorOverPoint = true;
            //map.dragPan.disable();
        } else {
            map.setPaintProperty('mrm-range', 'circle-color', '#3887be');
            canvas.style.cursor = '';
            mrm.isCursorOverPoint = false;
            //map.dragPan.enable();
        }
    });

    function mouseDown(e) {
        // todo: move this function, because this = e.target = map

        if (!mrm.isCursorOverPoint) return;

        mrm.isDragging = true;

        // Set a cursor indicator
        mrm._canvas.style.cursor = 'grab';
        console.log('!!! mousedown')
        console.log(e)
        // Mouse events
        map.on('mousemove', onMove);
        map.once('mouseup', onUp);
    }

    function onMove(e) {
        // todo: move this function, because this = e.target = map
        console.log('!!! mousemove')
        console.log(e.lngLat);
        if (!mrm.isDragging) return;
        console.log('coords: ');

        // Set a UI indicator for dragging.
        mrm._canvas.style.cursor = 'grabbing';

        // Move the marker position
        var coords = e.lngLat;
        mrm.setLngLat(coords);

    }

    function onUp(e) {
        // todo: move this function, because this = e.target = map
        if (!mrm.isDragging) return;

        var coords = e.lngLat;

        mrm._canvas.style.cursor = '';
        mrm.isDragging = false;

        mrm.pushLocation();

        // Unbind mouse events
        this.off('mousemove', onMove);
    }


    // Set `true` to dispatch the event before other functions call it. This
    // is necessary for disabling the default map dragging behaviour.
    map.on('mousedown', mouseDown, true);
});

// bind to main Racer .. TODO: set this in global module settings
if (mrm) {
    console.log('Main Racer Marker setup OKAY')
} else {
    console.log('Main Racer Marker setup failed...')
}
// mainUserTeamColor = mrm.color;