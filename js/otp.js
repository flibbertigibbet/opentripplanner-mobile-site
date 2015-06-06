var fromMarker = null;
var toMarker = null;

var options = {
    from: null,
    to: null
};

$(document).ready(function() {
    L.mapbox.accessToken = 'pk.eyJ1IjoiYmFuZGVya2F0IiwiYSI6ImVOaHNNa0UifQ.WkAeLdchgBBxJvmZ8tk0Yw';

    var geocoderControlFromPlace = L.mapbox.geocoderControl('mapbox.places',
        {
            autocomplete: true
        });

    var geocoderControlToPlace = L.mapbox.geocoderControl('mapbox.places',
        {
            //keepOpen: true,
            autocomplete: true
        });

    window.geocoder = geocoderControlToPlace;

    var map = L.mapbox.map('map', 'mapbox.streets', {zoomControl: false})
              // center on City Hall
              .setView([39.952684, -75.163733], 13)
              .addControl(geocoderControlFromPlace)
              .addControl(geocoderControlToPlace);

    // put zoom control top right
    new L.Control.Zoom({ position: 'topright' }).addTo(map);

    // set placeholder text in geocode controls
    geocoderControlFromPlace._input.placeholder = "From";
    geocoderControlToPlace._input.placeholder = "To";

    //L.control.locate().addTo(map);

    /*
    geocoderControlToPlace.on('found', function(res) {
        console.log(JSON.stringify(res.results.features[0]));
    });
    */

    /**
     * Helper function to prepare the parameter string for consumption by the OTP api
     *
     * @param {Array} coordsFrom The coords in lat-lng which we would like to travel from
     * @param {Array} coordsTo The coords in lat-lng which we would like to travel to
     * @param {Object} when Moment.js object for date/time of travel
     * @param {Object} extraOptions Other parameters to pass to OpenTripPlanner as-is
     *
     * @return {Object} Get parameters, ready for consumption
     */
    function prepareParams(coordsFrom, coordsTo, when, extraOptions) {
        var formattedOpts = {
            fromPlace: coordsFrom.join(','),
            toPlace: coordsTo.join(','),
            time: when.format('hh:mma'),
            date: when.format('MM-DD-YYYY'),
        };

        return $.extend(formattedOpts, extraOptions);
    }

    function getDirections(from, to, when, extraOptions) {
        var deferred = $.Deferred();
        var urlParams = prepareParams(from, to, when, extraOptions);
        $.ajax({
            url: 'http://opentrips.phl.io/otp/routers/default/plan',
            type: 'GET',
            crossDomain: true,
            data: urlParams
        }).then(function(data) {
            if (data.plan) {
                // Ensure unique itineraries.
                // Due to issue: https://github.com/opentripplanner/OpenTripPlanner/issues/1894
                // itineraries with transit + (bike/walk) can return 3 identical itineraries if only
                // bike/walk used, and not transit.
                var lastItinerary = null;
                var planItineraries = _.reject(data.plan.itineraries, function(itinerary) {
                    var thisItinerary = JSON.stringify(itinerary);
                    if (lastItinerary === thisItinerary) {
                        // found a duplicate itinerary; reject it
                        lastItinerary = thisItinerary;
                        return true;
                    }
                    lastItinerary = thisItinerary;
                    return false;
                });

                // return the Itinerary objects for the unique collection
                var itineraries = _(planItineraries).map(function(itinerary, i) {
                    return itinerary;
                }).value();
                deferred.resolve(itineraries);
            } else {
                deferred.reject(data.error);
            }
        }, function (error) {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    var tripLayer = null;
    function planTrip() {
        if (!options.from || !options.to) {
            return;
        }

        // options to pass to OTP as-is
        var otpOptions = {
            mode: 'WALK',
            arriveBy: false,
            wheelchair: false,
            maxWalk: 999999
        };
        var when = moment(); // TODO: select date/time

        getDirections(options.from, options.to, when, otpOptions).then(function(result) {
            console.log('got directions!');
            console.log(result);

            var legsGeoJson = _.map(result[0].legs, function(leg) {
                var linestringGeoJson = L.Polyline.fromEncoded(leg.legGeometry.points).toGeoJSON();
                linestringGeoJson.properties = leg;
                return linestringGeoJson;
            });

            if (tripLayer && map.hasLayer(tripLayer)) {
                map.removeLayer(tripLayer);
            }

            tripLayer = L.geoJson(legsGeoJson, {style: L.mapbox.simplestyle.style}).addTo(map);

        });
    }

    // helper for when marker dragged to new place
    function markerDrag(event) {
        var marker = event.target;
        window.marker = marker;
        var position = marker.getLatLng();
        var latlng = new L.LatLng(position.lat, position.lng);
        marker.setLatLng(latlng, {draggable: true});
        map.panTo(latlng); // allow user to drag marker off map

        // TODO: reverse geocode?
        marker.setPopupContent('<h3>' + marker.options.title + ':</h3><p>' + position.toString() + '</p>');

        if (marker.options.title === 'Origin') {
            options.from = [position.lat, position.lng];
        } else {
            options.to = [position.lat, position.lng];
        }
        
        planTrip();
    }

    function setGeocodeMarker(marker, label, result) {
        // TODO: handle geocode fail
        var placeName = result.feature.place_name; // one-line address
        var coords = new L.LatLng(result.feature.center[1], result.feature.center[0]);

        var color = null;

        if (label === 'Origin') {
            options.from = [result.feature.center[1], result.feature.center[0]];
            color = '33CC33';
        } else {
            options.to = [result.feature.center[1], result.feature.center[0]];
            color = 'FF5050';
        }

        if (!marker) {
            marker = L.marker(coords, {
                icon: L.mapbox.marker.icon({
                    'marker-color':  color
                }),
                draggable: true,
                title: label // hover text
            });
            marker.bindPopup(placeName);
            marker.addTo(map);
            marker.on('dragend', markerDrag);
        } else {
            marker.setLatLng(coords);
            marker.setPopupContent('<h3>' + label + ':</h3><p>' + placeName + '</p>');
        }

        planTrip();
    }

    geocoderControlFromPlace.on('select', function(res) {
        setGeocodeMarker(fromMarker, 'Origin', res);
    });

    geocoderControlToPlace.on('select', function(res) {
        setGeocodeMarker(toMarker, 'Destination', res);
        //L.mapbox.featureLayer(res.feature).addTo(map);
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
