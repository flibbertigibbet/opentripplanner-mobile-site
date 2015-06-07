var markers = {
    from: {
        marker: null,
        label: 'Origin',
        location: null,
        color: '33CC33' // green
    },
    to: {
        marker: null,
        label: 'Destination',
        location: null,
        color: 'FF5050' // pink
    }
};

var modeColors = {
    'WALK': '#333300',
    'BICYCLE': '#3333CC',
    'BUS': '#FF0000',
    'TRAIN': '#996633',
    'SUBWAY': '#CC0099',
    'TRAM': '#FFFF00',
    'RAIL': '#669900' // PATCO
};

var mode = 'WALK,TRANSIT';

var map, geocoderControlFromPlace, geocoderControlToPlace;

/**
 * Helper function to prepare the parameter string for consumption by the OTP API
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
    if (!markers.from.location || !markers.to.location) {
        return;
    }

    // options to pass to OTP as-is
    var otpOptions = {
        mode: mode,
        arriveBy: false,
        wheelchair: false,
        maxWalk: 999999
    };
    var when = moment(); // TODO: select date/time

    getDirections(markers.from.location, markers.to.location, when, otpOptions).then(function(result) {
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

        tripLayer = L.geoJson(legsGeoJson);

        tripLayer.eachLayer(function(layer) {
            var modeColor = modeColors[layer.feature.properties.mode];
            if (modeColor) {
                layer.setStyle({color: modeColor });
            } else {
                console.warn('no color for mode ' + layer.feature.properties.mode);
            }
        });

        tripLayer.addTo(map);
        map.fitBounds(tripLayer.getBounds());

    });
}

// helper for when marker dragged to new place
function markerDrag(event) {
    var marker = event.target;
    var position = marker.getLatLng();
    var latlng = new L.LatLng(position.lat, position.lng);
    marker.setLatLng(latlng, {draggable: true});

    marker.setPopupContent('<h3>' + marker.options.title + ':</h3><p>' + position.toString() + '</p>');

    if (marker.options.title === 'Origin') {
        markers.from.location = [position.lat, position.lng];
    } else {
        markers.to.location = [position.lat, position.lng];
    }
    
    planTrip();
}

function setGeocodeMarker(markerType, result) {
    var placeName = result.feature.place_name; // one-line address
    var coords = new L.LatLng(result.feature.center[1], result.feature.center[0]);

    markers[markerType].location = [result.feature.center[1], result.feature.center[0]];
    var popupData = '<h3>' + markers[markerType].label + ':</h3><p>' + placeName + '</p>';

    if (!markers[markerType].marker) {
        markers[markerType].marker = L.marker(coords, {
            icon: L.mapbox.marker.icon({
                'marker-color':  markers[markerType].color
            }),
            draggable: true,
            title: markers[markerType].label // hover text
        }
        ).bindPopup(popupData)
        .on('dragend', markerDrag)
        .addTo(map);
    } else {
        markers[markerType].marker.setLatLng(coords);
        markers[markerType].marker.setPopupContent(popupData);
    }

    planTrip();
}

function setMode() {
    modeArray = [];
    $('.mode').each(function(idx, val) {
        console.log(val);
        var $btn = $(val);
        if ($btn.hasClass('selected')) {
            modeArray.push($btn.val());
        }
    });
    mode = modeArray.join(',');
    console.log(mode);
}

function geocodeSelect(control, locationType, result) {
    setGeocodeMarker(locationType, result);
    // clear input and hide it
    $(control._input).val('');
    control._closeIfOpen();
}

//map.locate();
// Once we've got a position, zoom and center the map on it, and add a single marker.
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

// based on https://github.com/codrops/FullscreenOverlayStyles
function setupOverlay() {
    var triggerBtn = $('#trigger-overlay');
    var overlay = $('.overlay');
    var closeBtn = $('.overlay-close');
    var transEndEventNames = {
            'WebkitTransition': 'webkitTransitionEnd',
            'MozTransition': 'transitionend',
            'OTransition': 'oTransitionEnd',
            'msTransition': 'MSTransitionEnd',
            'transition': 'transitionend'
        };
    var transEndEventName = transEndEventNames[ Modernizr.prefixed('transition') ];
    var support = { transitions : Modernizr.csstransitions };

    function toggleOverlay() {
        if(overlay.hasClass('open')) {
            overlay.removeClass('open');
            overlay.addClass('close');
            var onEndTransitionFn = function( ev ) {
                overlay.off(transEndEventName);
                overlay.removeClass('close');
            };
            if(support.transitions) {
                overlay.on(transEndEventName, onEndTransitionFn);
            } else {
                onEndTransitionFn();
            }
        } else {
            overlay.addClass('open');
        }
    }

    triggerBtn.click(toggleOverlay);
    closeBtn.click(toggleOverlay);
}

$(document).ready(function() {
    $('.mode').click(function(event) {
        $(event.target).toggleClass('selected');
        $(event.target).toggleClass('btn-default');
        $(event.target).toggleClass('btn-primary');
        setMode();
    });

    L.mapbox.accessToken = 'pk.eyJ1IjoiYmFuZGVya2F0IiwiYSI6ImVOaHNNa0UifQ.WkAeLdchgBBxJvmZ8tk0Yw';

    geocoderControlFromPlace = L.mapbox.geocoderControl('mapbox.places',
        {
            autocomplete: true
        });

    geocoderControlToPlace = L.mapbox.geocoderControl('mapbox.places',
        {
            //keepOpen: true,
            autocomplete: true
        });

    window.geocoder = geocoderControlToPlace;

    map = L.mapbox.map('map', 'mapbox.streets', {zoomControl: false})
              // center on City Hall
              .setView([39.952684, -75.163733], 13)
              .addControl(geocoderControlFromPlace)
              .addControl(geocoderControlToPlace);

    // put zoom control top right
    new L.Control.Zoom({ position: 'topright' }).addTo(map);

    // set placeholder text in geocode controls
    geocoderControlFromPlace._input.placeholder = "From";
    geocoderControlToPlace._input.placeholder = "To";

    // when user selects address from autocomplete
    geocoderControlFromPlace.on('select', function(res) {
        geocodeSelect(geocoderControlFromPlace, 'from', res);
    });

    geocoderControlToPlace.on('select', function(res) {
        geocodeSelect(geocoderControlToPlace, 'to', res);
    });

    // when only one result and it is auto-selected
    geocoderControlFromPlace.on('autoselect', function(res) {
        geocodeSelect(geocoderControlFromPlace, 'from', res);
    });

    geocoderControlToPlace.on('autoselect', function(res) {
        geocodeSelect(geocoderControlToPlace, 'to', res);
    });


    // open 'to' input on page load
    geocoderControlToPlace._toggle();

    setupOverlay();

    //L.control.locate().addTo(map);
});
