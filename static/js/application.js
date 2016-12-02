// show the setup data provided by the server
console.log(flaskData);
console.log(flaskData.racers[0]);


// helper to handle objects
function cloneAsObject(obj) {
    if (obj === null || !(obj instanceof Object)) {
        return obj;
    }
    var temp = (obj instanceof Array) ? [] : {};
    // ReSharper disable once MissingHasOwnPropertyInForeach
    for (var key in obj) {
        temp[key] = cloneAsObject(obj[key]);
    }
    return temp;
}


// SocketIO for realtime bidirectional messages between client and server
if (window.location.protocol == "https:") {
    var ws_scheme = "wss://";
} else {
    var ws_scheme = "ws://"
};

var socket = io();
socket.on('connect', function() {
   socket.emit('derp event', {data: 'i am connecting hell yeah'});
   console.log("Websockets ready - connected");
});
console.log("Websockets initialized");

// enable vibration support
navigator.vibrate = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate;



//////////////////////
// Create Leaflet map - this is the main object of this whole app... but where do I have to put this :-S
var map = L.map('map',
    {
        dragging: true,     // disable dragging the map
        touchZoom: false,    // disable zooming on mobile
        // scrollWheelZoom: false,   // but not on PC
        doubleClickZoom: false,   // zoom on center, wherever you click
        fullscreenControl: true,
    }
);

// Add CartoDB tiles to the map
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 21,
    maxNativeZoom: 18,  // this allows to use a deeper maxZoom
    id: 'carto.light'
}).addTo(map);
console.log("Leaflet Map ready");


// Alternative tileset by MapBox

// L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
//    maxZoom: 18,
//    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
//        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
//        'Imagery © <a href="http://mapbox.com">Mapbox</a>',
//    id: 'mapbox.streets'
//}).addTo(map);



//////////////////////
//  MARKERS

// Prepare markers to use FontAwesome
L.ExtraMarkers.Icon.prototype.options.prefix = 'fa';

// the markers object keeps track of all markers (LOL)
// it's a dictionary that maps objectID to a marker [except for racers.. they use racer name (todo rework.. or not)]
var markers = {};

function RacerMarker(racer, options) {
    // racer must have these props:
    //   name, lat, lng, color, icon
    console.log("Racer - "+racer.name+" "+racer.lat+" "+racer.lng);

    var icon = L.ExtraMarkers.icon({
        icon: 'fa-'+racer.icon,
        markerColor: racer.color,
        shape: (options && options.shape) ? options.shape : 'square',
    });
    var marker = L.marker([racer.lat, racer.lng], {    // TODO: subclass
        icon: icon,
        title: racer.name,
        draggable: true,
        zIndexOffset: 400
    }).on('click', function (e) {
        var popup = e.target.getPopup();
        if (!popup) {
            e.target.bindPopup(e.target.options.title).openPopup();
        } else {
            popup.openPopup();
        }
    }).on('dragend', function (e) {
        e.target.pushLocation(e.target);
    });

    marker.pushLocation = function(){
        var pos = this.getLatLng();
        var data = {name:marker.options.title, lat: pos.lat, lng: pos.lng};
        console.log('Outbox: '+JSON.stringify(data));
        socket.emit('move marker', data);
    };

    marker.color = racer.color;

    return marker;
}

function MainRacerMarker(racer) {
    var marker = RacerMarker(racer, {shape : 'circle'});
    var colormap = {'red': '#A12F36', 'green': '#00934F', 'blue': '#0072B5'}
    // always display the Main User on top
    marker.setZIndexOffset(900);


    // add a Circle that shows the action range
    var mainRange = L.circle( marker.getLatLng(), 5,
            { //interactive: false,
                stroke: true,
                color: '#B40404',
                weight: 1
            }
    ).addTo(map);
    // this circle needs to follow the main marker at all time
    marker.on('move', function(e) {
        mainRange.setLatLng(e.latlng);
        mainUserTrack.push(e.latlng);    // this might get a bit fat in combination with dragging
    });

    // add BombMode support
    marker.activateBombMode = function(dropBomb, teardown) {
        mainRange.setRadius(50);
        mainRange.setStyle({
            color: '#2E2E2E',
            weight: 1
        });
        mainRange.once('click', dropBomb);
    };

    marker.deactivateBombMode = function() {
        mainRange.setRadius(5);
        mainRange.setStyle({
            color: '#B40404',
            weight: 1
        });
        mainRange.off('click');

    };

    return marker;
}

for (var i = 0 ; i < flaskData.racers.length; i++) {
    var racer = flaskData.racers[i];
    var ismainmarker = racer.name === flaskData.username;
    if (ismainmarker) {
        // setup the main central Racer
        markers[racer.name] = MainRacerMarker(racer).addTo(map);
    } else {
        // setup the other nearby Racers
        markers[racer.name] = RacerMarker(racer).addTo(map);
    }
}

// bind to main Racer .. TODO: set this in global module settings
var mrm = markers[flaskData.username];
var mainUserTeamColor = mrm.color;
console.log('We are team '+mainUserTeamColor);

//console.log('mainsusermarker iconsize '+mrm.options.icon.options.iconSize);
//mrm.options.icon.options.iconSize = [50,50];

console.log("Markers ready");



// add flags
function addFlagMarker(flag) {
    // var icon = L.ExtraMarkers.icon({
    //     icon: 'fa-flag',
    //     markerColor: flag.team,
    //     shape: 'circle',
    // });
    var icon = L.divIcon({
        className: 'flag-icon '+ flag.team,
        iconSize: [58, 58],
        //html:'<i class="fa fa-fw fa-2x fa-flag flag-icon"></i>'
    });
    markers[flag.id] = L.marker([flag.lat, flag.lng], {    // TODO: subclass
        icon: icon,
        title: flag.id,
        draggable: false,
        //zIndexOffset: 50
    }).addTo(map);
}

for (var i = 0; i < flaskData.flags.length; i++) {
    var flag = flaskData.flags[i];
    addFlagMarker(flag);
    // hide the carried flag - one of the racers has it!
    if (flag.state == 'carried')
        map.removeLayer(markers[flag.id]);
}

////////////////////////
//  BUTTONS

// add button that searches your location
L.easyButton({
    position: 'topleft',
    states : [
        {
            stateName: 'locator-disabled',
            icon: 'fa-crosshairs',
            onClick: function (btn, map) {
                mrm.bindPopup("Enabled Locator").openPopup();

                console.log("Start using Leaflet Location");
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
                mrm.bindPopup("Disabled Locator").openPopup();

                console.log("Stop using Leaflet Location");
                map.stopLocate();
                btn.state('locator-disabled');
            }
        }
    ]}).addTo(map);





// add button that sends your location
//L.easyButton('fa-star', pushMainLocation).addTo(map);

L.easyButton( 'fa-flag',   function() {
        var pos = mrm.getLatLng();
        data = {'lat':pos.lat, 'lng':pos.lng, 'team': mainUserTeamColor};
        socket.emit('add flag', data);
    }
).setPosition('bottomleft').addTo(map);

///////////////////////////////////
/// BOMBS AWAAAAY
//-------------------------------//

bombButton = L.easyButton({
    states : [
        {
            stateName: 'bombmode-off',
            icon: 'fa-bomb',
            onClick: function (btn) {
                this.setupBombMode(btn);
            }
        },
        {
            stateName: 'bombmode-on',
            icon: 'fa-times',
            onClick: function (btn) {
                this.teardownBombMode(btn);
            }
        }],

});

bombButton.dropBomb = function (e) {
    console.log('Dropped a BOMB muhahaha');
    var pos = e.latlng;
    var data = {lat: pos.lat, lng: pos.lng,}; // range: 200};
    socket.emit('add bomb', data);
    bombButton.teardownBombMode();
};

bombButton.setupBombMode = function(control) {
    mrm.activateBombMode(this.dropBomb);
    map.dragging.disable();
    map.touchZoom.disable();
    control.state('bombmode-on');
};

bombButton.teardownBombMode = function(control){
    //mrm.bindPopup("Disabled Bomb Mode").openPopup();
    mrm.deactivateBombMode();
    map.dragging.enable();
    map.touchZoom.enable();
    if (!control)  control = this;  // this is used after dropBomb
    control.state('bombmode-off');
};

bombButton.addTo(map);

function listenToButtonB(e) {
    if (e.originalEvent.key == 'b')
        bombButton.onClick();
};

map.on('keypress',  listenToButtonB);


function addBombMarker(json) {
    if (! json.pos) {
        var pos = [json.lat, json.lng];
    }
    var bomb = L.marker(pos, {
        // icon: L.ExtraMarkers.icon({
        //     icon: 'fa-bomb',
        //     markerColor: 'black',  //json.team
        //     shape: 'circle',
        // })
        icon: L.divIcon({
            className: 'bomb-icon',
            iconSize: [40,40],
        })
    }).addTo(map);
    bomb.bindPopup("BOOM");
    markers[json.id] = bomb;
}

socket.on('bomb added', function(json) {
    console.log("Inbox received:  B+");
    console.log("Inbox unpack..: "+json.lat+" "+json.lng);
    var marker = markers[json.id];
    if (!marker)
        addBombMarker(json);
    else
        console.log('.. but we already had that marker')
});

socket.on('bomb exploded', function(json) {
    console.log("Inbox received: BOOM");
    console.log("Inbox unpack..: bomb "+json.id+" at "+json.lat+" "+json.lng+" R: "+json.range);

    // get the bomb position
    var pos = [json.lat, json.lng];

    // check if we have a bomb marker on the screen and remove it
    var marker = markers[json.id];
    if (marker) {
        console.log("You and I, we knew this was coming");
        map.removeLayer(marker);
        delete markers[json.id];
    } else {
        console.log('Oh... what was that');
    }

    // use a Leaflet Circle to get the proper size in meters (a marker doesn't follow scale)
    var radius = 10;
    var damageRange = L.circle( pos, radius,
            {
                interactive: false,
                stroke: true,
                color: '#2E2E2E',
                fillOpacity: 0.6,
                weight: 3,
            }
    ).addTo(map);

    setTimeout( function(){
        var id = setInterval(function(){
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
    var audio = new Audio('static/sound/bomb.mp3');
    audio.play();

    // and buzz away
    if (navigator.vibrate) {
        navigator.vibrate([100,100,200]);
    }
});



///////////////////////////////
// SHOW TRACK button

var mainUserTrack = [];
var mainUserTrackPolyLine = L.polyline(mrm.getLatLng()).addTo(map);
L.easyButton('fa-bolt', function () {
    mainUserTrackPolyLine.setLatLngs(mainUserTrack);
    mrm.bindPopup("Show track of this session").openPopup();
    if (navigator.vibrate) {
        // vibration API supported
        // vibrate twice
        navigator.vibrate([100, 100, 100]);
    }
}).addTo(map);
console.log("Easy Buttons ready");

/////////////////////
// prepare leaflet map.locate callback functions

var prevMainPos = 0;    // move these globals to mrm
var prevTime = 0;
var pushReady = true;
function onLocationFound(e) {
    //
    mrm.setLatLng(e.latlng);
    map.setView(e.latlng);

    // Store this point to the tracker
    mainUserTrack.push(e.latlng);

    if (e.latlng == prevMainPos || e.timestamp < prevTime + 5000){
        return
    } else {
        mrm.pushLocation();
        prevMainPos = e.latlng;
        prevTime = e.timestamp;
    }
}

function onLocationError(e) {
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

            pushMarkerLocation(mrm);
            // update the map
            map.setView(pos, 14);
        }
    );
}

// connect location events to callback functions
map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

console.log("Leaflet location callbacks ready.. setView to main marker");




// TEAM SCORE BOARD

var teamScore = L.control();

teamScore.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "teamScore"
    this.update();
    return this._div;
};

// method that we will use to update the control based on feature properties passed
teamScore.update = function (props) {
    var html = '<h4>Team score</h4>';
    if (props && 'team' in props) {
        for (var color in props.team) {
            html += '<i style="background:' + color + '"></i> ' + props.team[color] + ' points<br>';
        }
    }
    this._div.innerHTML = html;
};

teamScore.addTo(map);

function resetScore(e) {
    teamScore.update();
}

//

map.setView(mrm.getLatLng(), 18);


// incoming websocket events
socket.on('marker moved', function(data) {
    console.log("Inbox received:  MM");
    console.log("Inbox unpack..: "+data.name+" "+data.lat+" "+data.lng);
    var marker = markers[data.name];
    if (marker) {
        marker.setLatLng(L.latLng(data.lat, data.lng));
    }
});

socket.on('marker added', function(data) {
    console.log("Inbox received:  M+");
    console.log("Inbox unpack..: "+data.name+" "+data.lat+" "+data.lng);
    var marker = markers[data.name];
    if (!marker){
        markers[data.name] = RacerMarker(data).addTo(map);
    }
    else
        console.log('.. but we already had that marker')
});

socket.on('marker removed', function(data) {
    console.log("Inbox received:  M-");
    console.log("Inbox unpack..: "+data.name);
    var marker = markers[data.name];
    if (marker) {
        map.removeLayer(marker);
        delete markers[data.name];
    } else {
        console.log('.. but we don\'t know that marker?')
    }

});

socket.on('new score', function(data) {
    console.log("Inbox received:  T+");
    console.log("Inbox unpack..: "+data.team[mainUserTeamColor]+" "+data.individual[flaskData.username]);
    teamScore.update(data);
});

socket.on('flag grabbed', function(data) {
    console.log("Inbox received:  Flag Grab");
    console.log("Inbox unpack..: "+data.name+" grabbed "+data.target);
    // set marker[data.name] icon to flag mode
    var flag = markers[data.target];
    if (flag) {
        map.removeLayer(flag);
    }
});

socket.on('flag dropped', function(data) {
    console.log("Inbox received:  Flag Drop");
    console.log("Inbox unpack..: "+data.name+" dropped "+data.target);
    var flag = markers[data.target];
    var racer = markers[data.name];
    if (flag) {
        // update position to drop site and add again to map
        flag.setLatLng(racer.getLatLng()).addTo(map);
    }
    // set marker[data.name] icon to flag mode
});

socket.on('flag returned', function(data) {
    console.log("Inbox received:  Flag Returned");
    console.log("Inbox unpack..: "+data.name+" returned "+data.target+". Now back to "+data.lat+','+data.lng);
    var flag = markers[data.target];
    var pos = [data.lat, data.lng];
    if (flag) {
        // update position to base
        flag.setLatLng(pos);
    }
});

socket.on('flag scored', function(data) {
    console.log("Inbox received:  Flag Score");
    console.log("Inbox unpack..: "+data.name+" scored "+data.target+". Now back to "+data.lat+','+data.lng);
    var flag = markers[data.target];
    var pos = [data.lat, data.lng];
    if (flag) {
        // update position to base
        flag.setLatLng(pos).addTo(map);
    }
});
