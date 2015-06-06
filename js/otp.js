$(document).ready(function() {
    L.mapbox.accessToken = 'pk.eyJ1IjoiYmFuZGVya2F0IiwiYSI6ImVOaHNNa0UifQ.WkAeLdchgBBxJvmZ8tk0Yw';

    var geocoderControlToPlace = L.mapbox.geocoderControl('mapbox.places',
        {
            keepOpen: true,
            autocomplete: true
        });

    window.geocoder = geocoderControlToPlace;

    var map = L.mapbox.map('map', 'mapbox.streets')
              // center on City Hall
              .setView([39.952684, -75.163733], 13)
              .addControl(geocoderControlToPlace);

    //L.control.locate().addTo(map);

    /*
    geocoderControlToPlace.on('found', function(res) {
        console.log(JSON.stringify(res.results.features[0]));
    });
    */

    geocoderControlToPlace.on('select', function(res) {
        console.log(res);
        //console.log(JSON.stringify(res.feature));
        //var coords = res.feature.center; // [lat,lon]
        //var name = res.feature.place_name; // one-line address

        L.mapbox.featureLayer(res.feature).addTo(map);
    });

    // TODO: when only one result
    //geocoderControlToPlace.on('autoselect', function(res) {

    //map.locate();
    // Once we've got a position, zoom and center the map
    // on it, and add a single marker.
    /*
    map.on('locationfound', function(e) {
        map.fitBounds(e.bounds);

        myLayer.setGeoJSON({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [e.latlng.lng, e.latlng.lat]
            },
            properties: {
                'title': 'Here I am!',
                'marker-color': '#ff8888',
                'marker-symbol': 'star'
            }
        });
    });
    */
});
