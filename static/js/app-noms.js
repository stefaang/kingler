// create a random guid
function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}


// add the pokebomber button
// this should end up in
var nomNodes = {};
var nomWays = {};
var plotNomNodeCounter = 0;
var plotNomNodes = [];
var plotNomLastPos = mrm.getLatLng();
var noms = L.featureGroup([]).addTo(map);
var nomIcon = L.AwesomeMarkers.icon({icon: 'diamond', markerColor: 'orange'});

L.easyButton('fa-coffee', function () {
    var range = 160;
    var pos = mrm.getLatLng();
    mrm.bindPopup("Drop da pokebomb!").openPopup();

    var query = 'https://overpass-api.de/api/interpreter?' +
        'data=[out:json][timeout:10];' +
        '(way(around:' + range + ',' + pos.lat + ',' + pos.lng + ');>;); out;';
    console.log(query);
    $.getJSON(query, function (data) {
        var d = cloneAsObject(data);
        var nodes = d.elements;
        console.log('Coffee got ' + nodes.length + ' nodes');
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];

            if (node.type == 'node') {
                var pos = L.latLng([node.lat, node.lon]);
                nomNodes[node.id] = pos;
            } else if (node.type == 'way') {
                var waynodes = cloneAsObject(node['nodes']);
                var wayarray = [];
                for (var j = 0; j < waynodes.length; j++) {
                    // get the node with this id
                    nodeID = waynodes[j];
                    nd = nomNodes[nodeID];
                    wayarray.push(nd);
                    plotNomNodes.push(nodeID);
                }
                nomWays[node.id] = wayarray;
            }
        }
        plotNomLastPos = mrm.getLatLng();
    });
}).addTo(map);

function isValidNom(pos) {
    var minRange = 80;
    var maxRange = 500;

    if (pos == null)
        return false;
    // too far away
    if (pos.distanceTo(mrm.getLatLng()) > maxRange)
        return false;
    // too close to other existing noms
    if (noms.getLayers().some(function (layer, i) {
            //console.log('Distance '+pos+' to '+layer.getLatLng()+' is '+pos.distanceTo(layer.getLatLng()));
            return pos.distanceTo(layer.getLatLng()) < minRange;
        }))
        return false;
    return true;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


class PokeMarker extends L.marker {
    constructor(pos, index) {
        // add a blurry marker that will become clear when you click it
        var blurryClass = 'pok pok' + ('00' + (index)).slice(-3) + ' blurrypok';
        var nearbyClass = 'pok pok' + ('00' + (index)).slice(-3) + ' nearbypok';
        var blurryHTML = '<div class="' + blurryClass + '"></div>';
        var clearHTML = '<div class="' + nearbyClass + '"></div>';
        var icon = L.divIcon({
            className: blurryClass,
            html: blurryHTML,
            iconAnchor: [40, 40]
        });
        super(pos, {
            title: blurryClass,
            icon: icon
        });
        this.icon = icon;
        this.pokIndex = nearbyClass;
        this.on('mousedown', function (e) {
            this.options.zIndexOffset = 100;
            console.log('MSDN ' + this.icon.options.html);
            console.log('MSDN ' + this.icon.options.className);
            console.log($('.pok .pok' + ('00' + (index)).slice(-3)));
            $('.pok .pok' + ('00' + (index)).slice(-3)).addClass('nearbypok').removeClass('blurrypok');
            console.log($('.pok .pok' + ('00' + (index)).slice(-3)));

        }).on('mouseup', function (e) {
            this.options.zIndexOffset = 10;
            console.log('MSUP ' + this.icon.options.html);
            console.log('MSUP ' + this.icon.options.className);
            console.log($('.pok .pok' + ('00' + (index)).slice(-3)));
            $('.pok .pok' + ('00' + (index)).slice(-3)).addClass('blurrypok').removeClass('nearbypok');
            console.log($('.pok .pok' + ('00' + (index)).slice(-3)));
        });
    }
}

var nomTimer = setInterval(addNomNode, 300);

function addNomNode() {
    var nomNodeReady = false;
    // console.log('yawn '+plotNomNodeCounter+" "+plotNomNodes.length);
    while (!nomNodeReady && plotNomNodeCounter < plotNomNodes.length) {
        var nodeID = plotNomNodes[plotNomNodeCounter];
        var pos = nomNodes[nodeID];
        // make sure the new point is not too close to the points we already have / nor too far
        while (plotNomNodeCounter < plotNomNodes.length && !isValidNom(pos)) {
            console.log('Skip NOM nr ' + plotNomNodeCounter);
            // get next nomNode
            nodeID = plotNomNodes[++plotNomNodeCounter];
            pos = nomNodes[nodeID];
        }
        if (!pos)
            break;
        // the current point is not too close to the current noms
        noms.addLayer(new PokeMarker(pos, getRandomInt(1, 151)));
        nomNodeReady = true;
        plotNomLastPos = pos;
        console.log('Put NOM at ' + pos + ' ' + pokIndex);
        if (navigator.vibrate) {
            // vibration API supported
            // vibrate once
            navigator.vibrate([100]);
        }
    }
    plotNomNodeCounter++;
}