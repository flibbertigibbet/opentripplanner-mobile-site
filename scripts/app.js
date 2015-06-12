/*! openTripPlannerMobileSite 2015-06-12 */

function prepareParams(a,b,c,d){var e={fromPlace:a.join(","),toPlace:b.join(","),time:c.format("hh:mma"),date:c.format("MM-DD-YYYY")};return $.extend(e,d)}function getDirections(a,b,c,d){var e=$.Deferred(),f=prepareParams(a,b,c,d);return $.ajax({url:"http://opentrips.phl.io/otp/routers/default/plan",type:"GET",crossDomain:!0,data:f}).then(function(a){if(a.plan){var b=null,c=_.reject(a.plan.itineraries,function(a){var c=JSON.stringify(a);return b===c?(b=c,!0):(b=c,!1)}),d=_(c).map(function(a,b){return a}).value();e.resolve(d)}else e.reject(a.error)},function(a){e.reject(a)}),e.promise()}function markerDrag(a){var b=a.target,c=b.getLatLng(),d=new L.LatLng(c.lat,c.lng);b.setLatLng(d,{draggable:!0}),b.setPopupContent("<h3>"+b.options.title+":</h3><p>"+c.toString()+"</p>"),"Origin"===b.options.title?markers.from.location=[c.lat,c.lng]:markers.to.location=[c.lat,c.lng],planTrip()}function setGeocodeMarker(a,b){var c=b.feature.place_name,d=new L.LatLng(b.feature.center[1],b.feature.center[0]);markers[a].location=[b.feature.center[1],b.feature.center[0]];var e="<h3>"+markers[a].label+":</h3><p>"+c+"</p>";markers[a].marker?(markers[a].marker.setLatLng(d),markers[a].marker.setPopupContent(e)):markers[a].marker=L.marker(d,{icon:L.mapbox.marker.icon({"marker-color":markers[a].color}),draggable:!0,title:markers[a].label}).bindPopup(e).on("dragend",markerDrag).addTo(map),planTrip()}function setMode(){modeArray=[],$(".mode").each(function(a,b){console.log(b);var c=$(b);c.hasClass("selected")&&modeArray.push(c.val())});var a=mode;mode=modeArray.join(","),a!=mode&&planTrip()}function geocodeSelect(a,b,c){setGeocodeMarker(b,c),$(a._input).val(""),a._closeIfOpen()}function setOrigin(a,b){markers.from.location=[a,b];var c=new L.LatLng(a,b),d="<h3>"+markers.from.label+":</h3><p>"+c.toString()+"</p>";markers.from.marker?(markers.from.marker.setLatLng(c),markers.from.marker.setPopupContent(d)):markers.from.marker=L.marker(c,{icon:L.mapbox.marker.icon({"marker-color":markers.from.color}),draggable:!0,title:markers.from.label}).bindPopup(d).on("dragend",markerDrag).addTo(map),contextPopup._close(),planTrip()}function setDestination(a,b){markers.to.location=[a,b];var c=new L.LatLng(a,b),d="<h3>"+markers.to.label+":</h3><p>"+c.toString()+"</p>";markers.to.marker?(markers.to.marker.setLatLng(c),markers.to.marker.setPopupContent(d)):markers.to.marker=L.marker(c,{icon:L.mapbox.marker.icon({"marker-color":markers.to.color}),draggable:!0,title:markers.to.label}).bindPopup(d).on("dragend",markerDrag).addTo(map),contextPopup._close(),planTrip()}function setupOverlay(){function a(){if(c.hasClass("open")){c.removeClass("open"),c.addClass("close");var a=function(a){c.off(f),c.removeClass("close")};g.transitions?c.on(f,a):a()}else c.addClass("open")}var b=$("#trigger-overlay"),c=$(".overlay"),d=$(".overlay-close"),e={WebkitTransition:"webkitTransitionEnd",MozTransition:"transitionend",OTransition:"oTransitionEnd",msTransition:"MSTransitionEnd",transition:"transitionend"},f=e[Modernizr.prefixed("transition")],g={transitions:Modernizr.csstransitions};b.click(a),d.click(a)}var markers={from:{marker:null,label:"Origin",location:null,color:"33CC33"},to:{marker:null,label:"Destination",location:null,color:"FF5050"}},modeColors={WALK:"#333300",BICYCLE:"#3333CC",BUS:"#FF0000",TRAIN:"#996633",SUBWAY:"#CC0099",TRAM:"#FFFF00",RAIL:"#669900"},mode="WALK,TRANSIT",map,geocoderControlFromPlace,geocoderControlToPlace,contextPopup,tripLayer=null,planTrip=_.throttle(function(){if(markers.from.location&&markers.to.location){var a={mode:mode,arriveBy:!1,wheelchair:!1,maxWalk:999999},b=moment();getDirections(markers.from.location,markers.to.location,b,a).then(function(a){console.log("got directions!"),console.log(a);var b=_.map(a[0].legs,function(a){var b=L.Polyline.fromEncoded(a.legGeometry.points).toGeoJSON();return b.properties=a,b});tripLayer&&map.hasLayer(tripLayer)&&map.removeLayer(tripLayer),tripLayer=L.geoJson(b),tripLayer.eachLayer(function(a){var b=modeColors[a.feature.properties.mode];b?a.setStyle({color:b}):console.warn("no color for mode "+a.feature.properties.mode)}),tripLayer.addTo(map),map.fitBounds(tripLayer.getBounds())})}},500,{leading:!0,trailing:!0});$(document).ready(function(){$(".mode").click(function(a){$(a.target).toggleClass("selected"),$(a.target).toggleClass("btn-default"),$(a.target).toggleClass("btn-primary"),setMode()}),L.mapbox.accessToken="pk.eyJ1IjoiYmFuZGVya2F0IiwiYSI6ImVOaHNNa0UifQ.WkAeLdchgBBxJvmZ8tk0Yw",geocoderControlFromPlace=L.mapbox.geocoderControl("mapbox.places",{autocomplete:!0}),geocoderControlToPlace=L.mapbox.geocoderControl("mapbox.places",{autocomplete:!0}),map=L.mapbox.map("map","mapbox.streets",{zoomControl:!1}).setView([39.952684,-75.163733],13).addControl(geocoderControlFromPlace).addControl(geocoderControlToPlace),new L.Control.Zoom({position:"topright"}).addTo(map),geocoderControlFromPlace._input.placeholder="From",geocoderControlToPlace._input.placeholder="To",geocoderControlFromPlace.on("select",function(a){geocodeSelect(geocoderControlFromPlace,"from",a)}),geocoderControlToPlace.on("select",function(a){geocodeSelect(geocoderControlToPlace,"to",a)}),geocoderControlFromPlace.on("autoselect",function(a){geocodeSelect(geocoderControlFromPlace,"from",a)}),geocoderControlToPlace.on("autoselect",function(a){geocodeSelect(geocoderControlToPlace,"to",a)}),geocoderControlToPlace._toggle(),setupOverlay(),map.on("contextmenu",function(a){contextPopup=L.popup(),contextPopup.setContent('<p><a href="#" onclick="setOrigin('+a.latlng.lat+","+a.latlng.lng+')">Start here</a></p><p><a href="#" onclick="setDestination('+a.latlng.lat+","+a.latlng.lng+')">End here</a></p>'),contextPopup.setLatLng(a.latlng),contextPopup.addTo(map)})});
//# sourceMappingURL=app.js.map