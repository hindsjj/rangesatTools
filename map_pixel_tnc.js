// Set Defaults
let url = '';
let dMin = -9998;
let dMax = 10000;
let bndyColor = '#FFF';
let opac = 0.8;

//-------------------------------//
// Load geojson ranch boundaries //
//-------------------------------//

var ranch;
usrRanch = "TNC";

function loadJSONFile(callback) {   

    var xmlobj = new XMLHttpRequest();
    xmlobj.overrideMimeType("application/json");
    xmlobj.open('GET', 'https://rangesat.nkn.uidaho.edu/api/geojson/Zumwalt/' + usrRanch, false); // Change true to false for synchronous loading.
    xmlobj.onreadystatechange = function () {
          if (xmlobj.readyState == 4 && xmlobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xmlobj.responseText);
          }
    };

    xmlobj.send(null);  
}

loadJSONFile(function(response) {
    ranch = JSON.parse(response);
});


//----------------//
// INITIALIZE MAP //
//----------------//

var marker;

// Basemaps
var googSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 16, subdomains:['mt0','mt1','mt2','mt3'] });
var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});

// Default map view
var map = L.map('map', {
    center: [45.6, -117.2],
    zoom: 10,
    layers: [OpenTopoMap, googSat]
});

var baseLayers = {
    "Topo": OpenTopoMap,
    "Satellite": googSat
};


// Custom NDVI and Biomass color scales
plotty.addColorScale("ndvicolors",   // identifier
    ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],  // color steps
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);    // percentage steps

plotty.addColorScale("biomasscolors",   // identifier
    ["#9e0142", "#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd", "#5e4fa2"],  // color steps
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);    // percentage steps


// Show boundaries of landowner's ranch
var usersRanch = L.geoJson(ranch, {
   style: {
      color: bndyColor,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.0
   },
   onEachFeature: function(feature, layer) {
      layer.bindPopup('<strong>Pasture: </strong>' + feature.properties.PASTURE + '<br /><strong>Hectares: </strong>' + feature.properties.Hectares + '<br /><strong>Mgmt Area: </strong>' + feature.properties.Ranch);
      layer.on({
         mouseover: function(e) {
           e.target.setStyle({
             weight: 3
           });
         },
         mouseout: function(e) {
           e.target.setStyle({
             weight: 1
           });
         }
      });
   },
   interactive: false  // allows map click to pass through polygon and return raster value
}).addTo(map);

map.fitBounds(usersRanch.getBounds());  // zooms to user's ranch

var overlays = {
   "Pastures": usersRanch
};

// Add layer toggle controller
L.control.layers(baseLayers, overlays).addTo(map);

// Disable scroll wheel zoom
map.scrollWheelZoom.disable();

// Add PRINT button
var printer = L.easyPrint({
   title: 'Download PNG image',
   position: 'bottomright',
   sizeModes: ['Current', 'A4Portrait', 'A4Landscape'],
   filename: 'rangeSatMap',
   exportOnly: true,
   hideControlContainer: true,
}).addTo(map);


//--------------------------//
// Process on-change events //
//--------------------------//

// Update pasture boundary color
$('#boundaryColor').change(function() {
   bndyColor = $(this).val();
   usersRanch.setStyle({ color: bndyColor });
});

// Adjust opacity of landsat raster
$('#opacitySlider').change(function() {
   opac = $(this).val();
   opac = opac/100;
   olay.setOpacity(opac);
});

// Toggle help text
$('#q1').click(function(){
   $('#indicator-help').toggle(500);
});


// On map click, set lat/lon and get raster value
map.on('click', function(e) {
//map.on('mousemove', function(e) {
    if (!marker) {
        marker = L.marker([e.latlng.lat,e.latlng.lng]).addTo(map);
    } else {
        marker.setLatLng([e.latlng.lat,e.latlng.lng]);
    }
    var rasterValue = olay.getValueAtLatLng(e.latlng.lat,e.latlng.lng).toFixed(1);

    if(indicator === 'ndvi' || indicator === 'nbr' || indicator === 'nbr2') {
       rasterValue = rasterValue/10000;
       rasterValue = rasterValue.toFixed(2);  // round to 2 decimal places
       marker.bindPopup(indicator + ': ' + rasterValue).openPopup();
    } else {
       rasterValue = rasterValue * 8.92179122;  // convert biomass from g/m2 to lbs/acre
       rasterValue = rasterValue.toFixed(0);  // round to 2 decimal places
       marker.bindPopup(indicator + ': ' + rasterValue + ' lbs/acre').openPopup();
    }
    $("#rasterValue").html(rasterValue);

});


//---------------------------------//
// UPDATE MAP with user selections //
//---------------------------------//

function updateMap() {

   var ucIndicator = indicator.toUpperCase();
   $('#vegInd').html(ucIndicator);
   $('#measure').html(ucIndicator);
   $('#scene').html(selScene);

   var satellite = selScene.substring(0,4);
   switch(satellite){
     case 'LC08':
       $('#sceneSatellite').html('Landsat 8');
       break;
     case 'LE07':
       $('#sceneSatellite').html('Landsat 7');
       break;
     case 'LT05':
       $('#sceneSatellite').html('Landsat 5');
       break;
     default:
       $('#sceneSatellite').html('Other');
   }


   if(indicator === 'ndvi' || indicator === 'nbr' || indicator === 'nbr2') {

      olay = L.leafletGeotiff( 
         url='https://rangesat.nkn.uidaho.edu/api/raster/Zumwalt/' + selScene + '/' + indicator + '/',
         options={ band: 0,
                name: 'NDVI',
                displayMin: dMin,
                displayMax: dMax,
                colorScale: 'ndvicolors',
                clampLow: false,
                clampHigh: false
         }
      ).addTo(map).setOpacity(opac);

      olay.setColorScale('ndvicolors');
      //olay.setStyle({ weight: "12" }); // attempt to fix disappearing geotiff
      $('#colorScaleImage').attr('src',olay.colorScaleData);
      $('#minVal').html("-1");
      $('#maxVal').html("1");

   } else {

      olay = L.leafletGeotiff(
         url="https://rangesat.nkn.uidaho.edu/api/raster/Zumwalt/" + selScene + "/" + indicator + "/?ranches=['" + usrRanch + "']",
         options={ band: 0,
                name: 'BIOMASS',
                displayMin: 2,
                displayMax: 280,
                colorScale: 'biomasscolors',
                clampLow: false,
                clampHigh: true
         }
      ).addTo(map).setOpacity(opac);

      olay.setColorScale('biomasscolors');
      $('#colorScaleImage').attr('src',olay.colorScaleData);
      $('#minVal').html("0");
      $('#maxVal').html("2500 lbs/acre");  // or 280 g/m^2

   }

   $('#downloadScene').attr('href',url);

} 
