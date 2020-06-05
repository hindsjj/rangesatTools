/* This script creates a Landsat scene map for RCR.
 * It is used with the script map_scene_select_sagesteppe.js
 */

/* Set Defaults */
let url = '';
let dMin = -9998;
let dMax = 10000;
let bndyColor = '#FFF';
let opac = 0.8;
let pp = '</table>';

/*-------------------------------
 * Load geojson ranch boundaries 
 *-------------------------------*/

var ranch;
usrRanch = "Rinker_Rock_Creek_Ranch";

function loadJSONFile(callback) {   

    var xmlobj = new XMLHttpRequest();
    xmlobj.overrideMimeType("application/json");
    xmlobj.open('GET', 'https://rangesat.org/api/geojson/SageSteppe/' + usrRanch, false); // Change true to false for synchronous loading.
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


/* Custom NDVI and Biomass color scales */
plotty.addColorScale("ndvicolors",   // identifier
    ["#a50026", "#d73027", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837"],  // color steps
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);    // percentage steps

plotty.addColorScale("biomasscolors",   // identifier
    ["#9e0142", "#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd", "#5e4fa2"],  // color steps
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);    // percentage steps
    //[0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9, 1.0]);    // percentage steps

    //['darkred','darkred','red','coral','orange','yellow','greenyellow','lime','cyan','dodgerblue','darkblue'],
    //[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);    // percentage steps


/* Landowner's pasture boundaries */
var usersRanch = L.geoJson(ranch, {
   style: {
      color: bndyColor,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.0
   },
   onEachFeature: function(feature, layer) {
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
         },
	 click: function() {
           var acres = feature.properties.Acres.toFixed(2);
           pp = "<tr><td><strong>Owner: </strong></td><td>Rock Creek Ranch</td></tr><tr><td><strong>Pasture: </strong></td><td>" + feature.properties.PASTURE +  "</td></tr><tr><td><strong>Acres: </strong></td><td>" + acres + "</td></tr></table>"
         }
      });
   },
   interactive: true  // false allows map click to pass through polygon and return raster value
}).addTo(map);

map.fitBounds(usersRanch.getBounds());  // zooms to user's ranch

var overlays = {
   "Pastures": usersRanch
};

/* Add layer toggle controller */
L.control.layers(baseLayers, overlays).addTo(map);

/* Disable scroll wheel zoom */
map.scrollWheelZoom.disable();

/* Map title box */
var info = L.control( { position: 'bottomleft' });

info.onAdd = function (map) {
   this._div = L.DomUtil.create('div', 'info');
   this.update();
   return this._div;
};

info.update = function () {
   this._div.innerHTML = '<div style="background:#fff;opacity:0.7;border-radius:6px;padding:4px 6px"><h4>Rock Creek Ranch</h4><span style="font-size:14px"><strong>' + indicatorDisplay + ', ' + selScene.substring(21,23) + '/' + selScene.substring(23,25) + '/' +  selScene.substring(17,21) + '</strong></span></div>';
};

info.addTo(map);

/* Map Legend */
var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
   this._div = L.DomUtil.create('div', 'info legend');
   this.update();
   return this._div;
};

legend.update = function () {

   if(indicator === 'ndvi') {
       grades = ['1', '0.8', '0.6', '0.4', '0.2', '0', '-0.2', '-0.4', '-0.6', '-0.8', '-1'];
       avgColors = ["#006837", "#1a9850", "#66bd63", "#a6d96a", "#d9ef8b", "#ffffbf", "#fee08b", "#fdae61", "#f46d43", "#d73027", "#a50026"];
       units = '';
   } else { // biomass
       //grades = ['0', '125', '250', '375', '500', '750', '1000', '1250', '1750', '2250', '2500'];
       //avgColors = ["#9e0142", "#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd", "#5e4fa2"];  
       grades = ['>2500', '2250-2500', '2000-2250', '1750-2000', '1500-1750', '1250-1500', '1000-1250', '750-1000', '500-750', '250-500', '<250'];
       avgColors = ["#5e4fa2", "#3288bd", "#66c2a5", "#abdda4", "#e6f598", "#ffffbf", "#fee08b", "#fdae61", "#f46d43", "#d53e4f", "#9e0142"];

       units = '<br>(lbs/acre)';
   }
 
   labels = [];

   for (var i = 0; i < grades.length; i++) {
        labels.push( '&nbsp;<span style="opacity:0.8;background-color:' + avgColors[i] + '">&nbsp;&nbsp;&nbsp;&nbsp;</span> ' + grades[i] );
   }

   this._div.innerHTML = '<div style="background:#fff;opacity:0.8;border-radius:6px;padding:4px 6px">' + indicatorDisplayStack + units + '<br>' + labels.join('<br>') + '</div>';
};

legend.addTo(map);


/*--------------------------
 * Process on-change events 
 *--------------------------*/

/* Update pasture boundary color */
$('#boundaryColor').change(function() {
   bndyColor = $(this).val();
   usersRanch.setStyle({ color: bndyColor });
});

/* Adjust opacity of landsat raster */
$('#opacitySlider').change(function() {
   opac = $(this).val();
   opac = opac/100;
   olay.setOpacity(opac);
});

/* Toggle help text */
$('#q1').click(function(){
   $('#indicator-help').toggle(500);
});


/*---------------------------------
 * UPDATE MAP with user selections 
 *---------------------------------*/

function updateMap() {

   var ucIndicator = indicatorDisplay;
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
         url='https://rangesat.org/api/raster/SageSteppe/' + selScene + '/' + indicator + '/',
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
      /* olay.setStyle({ weight: "12" }); // attempt to fix disappearing geotiff */
      $('#colorScaleImage').attr('src',olay.colorScaleData);
      $('#minVal').html("-1");
      $('#maxVal').html("1");

   } else {

      olay = L.leafletGeotiff(
         url="https://rangesat.org/api/raster/SageSteppe/" + selScene + "/" + indicator + "/?ranches=['" + usrRanch + "']",
         options={ band: 0,
                name: 'Herbaceous<br />Biomass',
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
      filename: 'pixelMap_' + selDate + '_tnc',
      exportOnly: true,
      hideControlContainer: true
   }).addTo(map);

   /* Update map title and legend */
   info.update();
   legend.update();
} 

/* Map click handler to build popup */
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

  var html = "<table class='popUpTbl'><tr class='border-bot'><td><strong>" + indicatorDisplayStack + ":</strong></td><td>" + rasterValue + "</td></tr>" + pp;

  map.openPopup(html, e.latlng, {
    offset: L.point(0, 0)
  });

  /* Now, reset pp in case next map click is not within a pasture */
  pp = '</table>';  

}

map.on('click', clickHandler);
