/* This script creates a Landsat scene map for authenticated users.
 * It is used with the script map_scene_select.js
 */

/* Set defaults */
let url = '';
let usrRanch = $("#ddRanch").val();
let bndyColor = '#ffffff';
let opac = 0.8;
let usersRanch = [];
let dMin = -9998;
let dMax = 10000;
let pp = '</table>';

/*------------------
 * On change events 
 *------------------*/

$('#ddRanch').change(function() {
   usrRanch = $(this).val();
   if(usersRanch) { map.removeLayer(usersRanch); }   // clear existing ranch 
   updateRanch();
   map.removeLayer(olay); // clear Landsat overlay
   updateMap();
});

$('#boundaryColor').change(function() {
   bndyColor = $(this).val();
   usersRanch.setStyle({ color: bndyColor });
});

$('#opacitySlider').change(function() {
   opac = $(this).val();
   opac = opac/100;
   olay.setOpacity(opac);
});

$('#q1').click(function(){
   $('#indicator-help').toggle(500);
});

/*----------------
 * INITIALIZE MAP 
 *----------------*/

/* Basemaps */
var googSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 16, subdomains:['mt0','mt1','mt2','mt3'] });
var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});

/* Default map view */
var map = L.map('map', {
   center: [45.6, -117.2],
   zoom: 10,
   layers: [OpenTopoMap, googSat]
});

var baseLayers = {
   "Topo": OpenTopoMap,
   "Satellite": googSat
};

/* Custom NDVI and Biomass color scale */
plotty.addColorScale("ndvicolors",   // identifier
   ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],  // color steps
   [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);    // percentage steps

plotty.addColorScale("biomasscolors",   // identifier
   ["#9e0142", "#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd", "#5e4fa2"],  // color steps
   [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);    // percentage steps


/* Disable scroll wheel zoom */
map.scrollWheelZoom.disable();

/* Add layer toggle controller */
L.control.layers(baseLayers).addTo(map);


/*-------------------------------
 * Load geojson ranch boundaries 
 *-------------------------------*/

updateRanch(); // on initial page load

function updateRanch() {

   function loadJSONFile(callback) {   

      var xmlobj = new XMLHttpRequest();
      xmlobj.overrideMimeType("application/json");
      xmlobj.open('GET', 'https://rangesat.org/api/geojson/Zumwalt/' + usrRanch, false); // Change true to false for synchronous loading.
      xmlobj.onreadystatechange = function () {
         if (xmlobj.readyState == 4 && xmlobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xmlobj.responseText);
         }
      };

      xmlobj.send(null);  
   }

   loadJSONFile(function(response) {
      var ranch = JSON.parse(response);

      usersRanch = L.geoJson(ranch, {
         style: {
            color: bndyColor,
            weight: 1,
            opacity: 1,
            fillOpacity: 0.0
         },
         onEachFeature: function(feature, layer) {
            layer.on({
               mouseover: function(e) {
                  e.target.setStyle({
                     weight: 2
                  });
               },
               mouseout: function(e) {
                  e.target.setStyle({
                     weight: 1
                  });
               },
	       click: function(e) {
		  var acres = 2.471 * feature.properties.Hectares;
      		  acres = acres.toFixed(2);
                  pp = "<tr><td><strong>Area: </strong></td><td>" + feature.properties.Ranch + "</td></tr><tr><td><strong>Pasture: </strong></td><td>" + feature.properties.PASTURE + "</td></tr><tr><td><strong>Acres: </strong></td><td>" + acres + "</td></tr></table>"
	       }
            });
         },
         interactive: true  // false allows map click to pass through polygon and return raster value
      }).addTo(map);

      map.fitBounds(usersRanch.getBounds());  // zooms to user's ranch

   });

}


/*---------------------------------
 * UPDATE MAP with user selections 
 *---------------------------------*/

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
         url='https://rangesat.org/api/raster/Zumwalt/' + selScene + '/' + indicator + '/',
         options={ band: 0,
                name: 'NDVI',
                /*opacity: 0.8,*/
                displayMin: dMin,
                displayMax: dMax,
                colorScale: 'ndvicolors',
                clampLow: false,
                clampHigh: false
         }
      ).addTo(map).setOpacity(opac);

      olay.setColorScale('ndvicolors');
      $('#colorScaleImage').attr('src',olay.colorScaleData);
      $('#minVal').html("-1");
      $('#maxVal').html("1");

   } else {

      olay = L.leafletGeotiff(
         url="https://rangesat.org/api/raster/Zumwalt/" + selScene + "/" + indicator + "/?ranches=['" + usrRanch + "']",
         options={ band: 0,
                name: 'BIOMASS',
                /*opacity: 0.8,*/
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

   /* Add/update PRINT button */
  $('.leaflet-control-easyPrint').remove();  // remove any existing print buttons
   var printer = L.easyPrint({
      title: 'Download PNG image',
      position: 'topleft',
      sizeModes: ['Current', 'A4Portrait', 'A4Landscape'],
      filename: 'pixelMap_' + selDate + '_' + usrRanch,
      exportOnly: true,
      hideControlContainer: true
   }).addTo(map);

} 

/* Map click handler to build popup window */
function clickHandler(e) {

  var rasterValue = olay.getValueAtLatLng(e.latlng.lat,e.latlng.lng).toFixed(1);

  if(indicator === 'ndvi' || indicator === 'nbr' || indicator === 'nbr2') {
       rasterValue = (rasterValue/10000).toFixed(2);  // round to 2 decimal places
       if(rasterValue == -1) { rasterValue = 'N/A'; }
  } else {
       rasterValue = (rasterValue * 8.92179122).toFixed(0);  // convert biomass from g/m2 to lbs/acre, round to integer
       if(rasterValue < 0) { rasterValue = 'N/A'; } else { rasterValue = rasterValue + ' lbs/acre'; }
  }
  $("#rasterValue").html(rasterValue);

  var html = "<table class='popUpTbl'><tr class='border-bot'><td><strong>" + indicator.toUpperCase() + ":</strong></td><td>" + rasterValue + "</td></tr>" + pp;

  map.openPopup(html, e.latlng, {
    offset: L.point(0, 0)
  });

  /* Now, reset pp in case next map click is not within a pasture */
  pp = '</table>';

}

map.on('click', clickHandler);
