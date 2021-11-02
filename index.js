// ignore this error, it works fine
mapboxgl.accessToken =
  "ADD YOUR TOKEN HERE";


const map = new mapboxgl.Map({
  container: "map", // container id
  //TODO Add a custom style
  style: "mapbox://styles/mapbox/streets-v11", // style URL
  //TODO Localize the map to the user's location
  center: [-84.3, 33], // starting position [lng, lat]
  //center: [lng,lat],
  zoom: 9 // starting zoom
});

var traffic =   new MapboxDirections({
    accessToken: mapboxgl.accessToken,
    alternatives: false,
    profile: 'mapbox/driving-traffic',
    controls: {instructions: false, profileSwitcher: false},
    geometries: 'geojson',
    flyTo: true});

window.traffic = traffic;
//const steps = 500;
// create a function to make a directions request
async function getRoute(start,stop) {
  // make directions request using driving profile
  begin = start.geometry.coordinates;
  end = stop.geometry.coordinates
  const query = await fetch(
     `https://api.mapbox.com/directions/v5/mapbox/driving/${begin[0]},${begin[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
     { method: 'GET' }
   );
   const json = await query.json();
   const data = json.routes[0];
   const route = data.geometry.coordinates;
   const geojson = {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'LineString',
            'coordinates': route
          }
        };

   if (map.getSource('drivroute')) {
     map.getSource('drivroute').setData(geojson);
   }else {
          map.addLayer({
            'id': 'drivroute',
            'type': 'line',
            'source': {
              'type': 'geojson',
              'data': geojson
            },
            'layout': {
              'line-join': 'round',
              'line-cap': 'round'
            },
            'paint': {
              'line-color': 'green',
              'line-width': 5,
              'line-opacity': 0.75
            }
          });
        }
  }
async function poiQuery(point) {
  //console.log(point)
  const query = await fetch(
     `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${point[0]},${point[1]}.json?radius=50&limit=5&dedupe&geometry=point&access_token=${mapboxgl.accessToken}`,
     { method: 'GET' }
   );
   const json = await query.json();
   //console.log(json);
   document.getElementById('features').innerHTML = JSON.stringify(json);
}

map.addControl(traffic, 'top-left');

// Add geolocate control to the map.
map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
  },
  // When active the map will receive updates to the device's location as it changes.
  trackUserLocation: true,
  // Draw an arrow next to the location dot to indicate which direction the device is heading.
  showUserHeading: true
  })
);

let counter = 0;
const steps = 1000;

map.on("load", () => {
  thesource = [0,0];
  thedestination = [];

  //we zppm to the place if there are crdinates
  if (navigator.geolocation) {
    thesource = []
    navigator.geolocation.getCurrentPosition(function(position) {
      coordinates = [position.coords.longitude , position.coords.latitude];
      thesource = coordinates;
      map.flyTo({center: coordinates, essential: true});
      traffic.setOrigin(thesource);
    });
  }

  const point = {
    'type': 'FeatureCollection',
    'features': [{
      'type': 'Feature',
      'properties': {},
      'geometry': {
        'type': 'Point',
        'coordinates': thesource
      }
    }
  ]};
  map.addSource('point', {
    'type': 'geojson',
    'data': point
  });
  map.addLayer({
      'id': 'point',
      'source': 'point',
      'type': 'symbol',
      'layout': {
          'icon-image': 'car-15',
          'icon-rotate': ['get', 'bearing'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
      }
  });

  traffic.on('route',function(d)
  {
    getRoute(traffic.getOrigin(),traffic.getDestination());
  });
  map.on('dblclick', 'directions-route-line' , function (e) {
    animate(e.features[0].geometry.coordinates);
   });
  function animate(){
     thelength = map.getSource('directions')._data.features.length;
     navroute = map.getSource('directions')._data.features[thelength-1].geometry;
     start = navroute.coordinates[counter];
     end = navroute.coordinates[counter+1];
     if (!start || !end){
       document.getElementById('features').innerHTML = "You've arrived";
       return
     };
     point.features[0].geometry.coordinates = navroute.coordinates[counter];
     point.features[0].properties.bearing = turf.bearing(
       turf.point(start),
       turf.point(end));
     map.getSource('point').setData(point);
     //doing this to get at center point due to no time
     if (counter == Math.round(navroute.coordinates.length/ 2)){
       poiQuery(end);
     }

     if (counter < steps) {
     requestAnimationFrame(animate);
    }
     counter = counter + 1;
   }
});
