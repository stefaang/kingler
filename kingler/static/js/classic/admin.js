/**
 * Created by stefaan on 21-2-17.
 */
"use strict";
map.stopLocate();
map.dragging.enable();


for(var mid in markers) {
    console.log('ADMIN: add dragging to markers');
    console.log(mid);
    var marker = markers[mid];
    if(marker.mtype === 'racer') {
        marker.dragging.enable();
        marker.on('dragend', marker.pushLocation);
    } else if (marker.mtype === 'beast') {

    } else if (marker.mtype === 'coin') {
        marker.on('click', function(e) {
            "use strict";
            // modify coin type / delete coin / set value

        })
    }
}

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
}).addTo(map);



// A button to Add a Beast Stop to the map
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



// A button to Add a Coin to the map
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


// A button to Add a Flag to the map (TODO: admin only)
// L.easyButton( 'fa-flag',   function() {
//         var pos = mrm.getLatLng();
//         var data = {'lat':pos.lat, 'lng':pos.lng, 'team': mrmColor};
//         socket.emit('add flag', data);
//     }
// ).addTo(map);


