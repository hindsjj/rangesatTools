/* This script creates a Landsat scene map for TNC.
 * It is used with the script map_scene_select.js
 */

/* Set Defaults */
let url = '';
let dMin = -9998;
let dMax = 10000;
let bndyColor = '#FFF';
let opac = 0.8;
const bc = 8.92179122;  // biomass conversion: converts g/m^2 to lbs/acre
//let threshold = 1500; // lb/ac
//let thrStop1 = threshold/bc;   // g/m^2
//let thrStop2 = thrStop1 + 1;   // g/m^2
let tRangeMin = 0;
let tRangeMax = 2500;
let tStep = 50;
let tVals = [1000, 1500];
let tPct1a = 0.4;  // or 1000 lb/ac for biomass
let tPct1b = 0.4001;
let tPct2a = 0.6;  // or 1500 lb/ac for biomass
let tPct2b = 0.6001; 
let tLower = 1000;
let tUpper = 1500;
let pop = '</table>';
let units = 'lbs/acre';
let bins = '[0,112,168,500]'; // threshold bins in g/m^2 for threshold table
let binLower = '112';  // this is tLower divided by 8.92179122 (for biomass)
let binUpper = '168';  // this is tUpper divided by 8.92179122 (for biomass)
var tbl = '';
indicator = 'biomass';

/*-------------------------------
 * Load geojson ranch boundaries 
 *-------------------------------*/

var ranch;
usrRanch = "TNC";

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
plotty.addColorScale("thresholdcolors", ["#ffff73", "#ffff73", "#abd9e9", "#abd9e9", "#2c7bb6", "#2c7bb6"], [0, tPct1a, tPct1b, tPct2a, tPct2b, 1.0]);


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
           var acres = 2.471 * feature.properties.Hectares;
           acres = acres.toFixed(2);
           pop = "<tr><td><strong>Area: </strong></td><td>" + feature.properties.Ranch + "</td></tr><tr><td><strong>Pasture: </strong></td><td>" + feature.properties.PASTURE +  "</td></tr><tr><td><strong>Acres: </strong></td><td>" + acres + "</td></tr></table>"
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
   this._div.innerHTML = '<div style="background:#fff;opacity:0.7;border-radius:6px;padding:4px 6px"><h4>The Nature Conservancy</h4><span style="font-size:14px"><strong>' + indicator.toUpperCase() + ', Date: ' + selScene.substring(21,23) + '/' + selScene.substring(23,25) + '/' +  selScene.substring(17,21) + '</strong></span></div>';
   summaryTable();
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
this._div.innerHTML = '<div style="background:#fff;opacity:0.8;border-radius:6px;padding:4px 6px">' + indicator.toUpperCase() + '<br>' + units + '<br><span style="background-color:#ffff73">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;below<br><span style="background-color:#abd9e9">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;' + tLower + '-' + tUpper + '<br><span style="background-color:#2c7bb6">&nbsp;&nbsp;&nbsp;&nbsp;</span>&nbsp;above</div>';
};

legend.addTo(map);


/*--------------------------
 * Process on-change events 
 *--------------------------*/

$('#dl').click(function() {
   $('#tableSummary table').table2csv(); // CSV download button
});

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

/* Adjust THRESHOLD value */

thresholdUpdate();  // run on initial page load

function thresholdUpdate() {
  $('#threshold-range').slider({
      range: true,
      min: tRangeMin,
      max: tRangeMax,
      step: tStep,
      values: tVals,
      change: function(event, ui) {
        tLower = ui.values[0];
        tUpper = ui.values[1];
        $('#threshRange').val(tLower + ' - ' + tUpper);
	if(indicator==='biomass'){
           console.log('biomass');
           tPct1a = tLower/(bc*280);
           tPct1b = tPct1a + 0.0001;
           tPct2a = tUpper/(bc*280);;
           tPct2b = tPct2a + 0.0001;
           plotty.addColorScale("thresholdcolors", ["#ffff73", "#ffff73", "#abd9e9", "#abd9e9", "#2c7bb6", "#2c7bb6"], [0, tPct1a, tPct1b, tPct2a, tPct2b, 1.0]);
           olay.setColorScale('thresholdcolors');
        } else { // indicator = ndvi
           console.log('ndvi');
           tPct1a = (tLower + 1.00001)/2;
           tPct1b = tPct1a + 0.0001;
           tPct2a = (tUpper + 1.00001)/2;
           tPct2b = tPct2a + 0.0001;
           plotty.addColorScale("thresholdcolors", ["#ffff73", "#ffff73", "#abd9e9", "#abd9e9", "#2c7bb6", "#2c7bb6"], [0, tPct1a, tPct1b, tPct2a, tPct2b, 1.0]);
           olay.setColorScale('thresholdcolors');
        }
        info.update();
        legend.update();
      }
  });
  $('#threshRange').val( $('#threshold-range').slider('values', 0) + ' - ' + $('#threshold-range').slider('values', 1) );
}


/* On indicator change -- this is also called in map_scene_select */
$('#indicator').change(function() {
   if(indicator==='biomass'){
     units = 'lbs/acre';
     $('#units').show();
     $('#thrMin').html('0');
     $('#thrMax').html('2500 lbs/ac');
     $('#threshold').attr({ value: '1500', min: '0', max: '2500', step: '50' });
     $('#threshVal').html('1500');
     threshold = 1500;
     tRangeMin = 0; tRangeMax = 2500; tStep = 50; tVals = [1000, 1500];
     plotty.addColorScale("thresholdcolors", ["#ffff73", "#ffff73", "#abd9e9", "#abd9e9", "#2c7bb6", "#2c7bb6"], [0, 0.4, 0.4001, 0.6, 0.6001, 1.0]);
     olay.setColorScale('thresholdcolors');
     info.update();
     legend.update();
     thresholdUpdate();
   } else {  // indicator is ndvi
     units = '';
     $('#units').hide();
     $('#thrMin').html('-1');
     $('#thrMax').html('1');
     $('#threshold').attr({ value: '0.5', min: '-1', max: '1', step: '0.05' });
     $('#threshVal').html('0.5');
     threshold = 0.5;
     tRangeMin = -1; tRangeMax = 1; tStep = 0.05; tVals = [0.2, 0.5];
     plotty.addColorScale("thresholdcolors", ["#ffff73", "#ffff73", "#abd9e9", "#abd9e9", "#2c7bb6", "#2c7bb6"], [0, 0.5, 0.5001, 0.75, 0.7501, 1.0]);
     olay.setColorScale('thresholdcolors');
     info.update();
     legend.update();
     thresholdUpdate();
  }
});

/* Toggle help text */
$('#q1').click(function(){
   $('#indicator-help').toggle(500);
});


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
                displayMin: -9998, 
                displayMax: 10000,
                colorScale: 'thresholdcolors',
                clampLow: false,
                clampHigh: false
         }
      ).addTo(map).setOpacity(opac);

      olay.setColorScale('thresholdcolors');

   } else {

      olay = L.leafletGeotiff(
         url="https://rangesat.org/api/raster/Zumwalt/" + selScene + "/" + indicator + "/?ranches=['" + usrRanch + "']",
         options={ band: 0,
                name: 'BIOMASS',
                displayMin: 2,
                displayMax: 280,
                colorScale: 'thresholdcolors',
                clampLow: false,
                clampHigh: true
         }
      ).addTo(map).setOpacity(opac);

      olay.setColorScale('thresholdcolors');

   }

   $('#downloadScene').attr('href',url);


   /* Add/update PRINT button */
   $('.leaflet-control-easyPrint').remove();  // remove any existing print buttons
   var printer = L.easyPrint({
      title: 'Download PNG image',
      position: 'topleft',
      sizeModes: ['Current', 'A4Portrait', 'A4Landscape'],
      filename: 'pixelThreshold_' + selDate + '_tnc',
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

  var html = "<table class='popUpTbl'><tr class='border-bot'><td><strong>" + indicator.toUpperCase() + ":</strong></td><td>" + rasterValue + "</td></tr>" + pop;

  map.openPopup(html, e.latlng, {
    offset: L.point(0, 0)
  });

  /* Now, reset pop in case next map click is not within a pasture */
  pop = '</table>';  

}

map.on('click', clickHandler);


/* ------------------------ 
 *  THRESHOLD TABLE  
 *  summary of pixel counts 
 *  for a given scene
 * ------------------------ */

function summaryTable() {
console.log('SELSCENE: ' + selScene);
   if(indicator==='biomass'){
      binLower = tLower/8.92179122;
      binUpper = tUpper/8.92179122;
      bins = '[0,' + binLower.toString() + ',' + binUpper.toString() + ',500]';
   } else {  // ndvi
      binLower = tLower * 10000;
      binUpper = tUpper * 10000;
      bins = '[-10000,' + binLower.toString() + ',' + binUpper.toString() + ',10000]';
   }

   /* build table header */
   tbl = ''; // clear table
   tbl = '<table class="table-sm" style="width:100%"><thead><tr><th>' + indicator.toUpperCase() + ' Scene Date</th><th>Mgmt Area</th><th>Pasture</th><th># of Acres Below <br /> ' + tLower +' ' + units + '</th><th># of Acres Between <br />' + tLower + '-' + tUpper + ' ' + units + '</th><th># of Acres Above <br />' + tUpper + ' ' + units + '</th><th>% Missing Pixels</th></tr></thead><tbody>';

   /* ranch-level summary route */
   var url1 = 'https://www.rangesat.org/api/histogram/single-scene/Zumwalt/' + usrRanch + '/?bins=' + bins + '&product=' + indicator + '&product_id=' + selScene;
   //console.log('URL1: ' + url1);
   var xmlhttp1 = new XMLHttpRequest(); 
   xmlhttp1.open("GET", url1, false); // true is async, false is sync loading
   xmlhttp1.overrideMimeType("application/json");
   xmlhttp1.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          var obj1 = JSON.parse(this.responseText);

	  /* each pixel is 30x30m = 900 m^2 = 0.222395 acres */
	  var areaLower1   = (obj1.counts[0]) * 0.222395;  // in acres
          var areaBetween1 = (obj1.counts[1]) * 0.222395;  // in acres
          var areaUpper1   = (obj1.counts[2]) * 0.222395;  // in acres
          var missingPx1    = (obj1.masked/obj1.total_px) * 100; // as percent  

          tbl = tbl + '<tr><td>' + selScene.substring(21,23) + '/' + selScene.substring(23,25) + '/' +  selScene.substring(17,21) + '</td><td>' + usrRanch + '</td><td>ALL PASTURES</td><td>' + areaLower1.toFixed(0) + '</td><td>' + areaBetween1.toFixed(0) + '</td><td>' + areaUpper1.toFixed(0) + '</td><td>' + missingPx1.toFixed(0) + '%</td></tr>';

      }
   };
   xmlhttp1.send(null);


   /* pasture-level summary route */
   var url2 = 'https://www.rangesat.org/api/histogram/single-scene-bypasture/Zumwalt/' + usrRanch + '/?bins=' + bins + '&product=' + indicator + '&product_id=' + selScene;
   //console.log('URL2: ' + url2);

   var xmlhttp2 = new XMLHttpRequest();
   xmlhttp2.open("GET", url2, false); 
   xmlhttp2.overrideMimeType("application/json");
   xmlhttp2.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          var obj2 = JSON.parse(this.responseText);

          for(var i = 0; i < obj2.length; i++) {

	     var pasture = obj2[i].pasture;
	     /* each pixel is 30x30m = 900 m^2 = 0.222395 acres */
             var areaLower2   = (obj2[i].counts[0]) * 0.222395;  // in acres
             var areaBetween2 = (obj2[i].counts[1]) * 0.222395;  // in acres
             var areaUpper2   = (obj2[i].counts[2]) * 0.222395;  // in acres
             var missingPx2   = (obj2[i].masked/obj2[i].total_px) * 100; // as percent  

             tbl = tbl + '<tr><td>' + selScene.substring(21,23) + '/' + selScene.substring(23,25) + '/' +  selScene.substring(17,21) + '</td><td>' + usrRanch + '</td><td>' + pasture + '</td><td>' + areaLower2.toFixed(0) + '</td><td>' + areaBetween2.toFixed(0) + '</td><td>' + areaUpper2.toFixed(0) + '</td><td>' + missingPx2.toFixed(0) + '%</td></tr>';

          }
      }
   };
   xmlhttp2.send(null);


   tbl = tbl + '</tbody></table>';

   $('#tableSummary').html(tbl);

}


