/* This script handles Landsat scene selections for Relative Difference. */

/*-----------------------------------------
 * Initialize dropdowns, arrays, variables 
 *-----------------------------------------*/

let usrRanch = $("#ddRanch").val();
var ranch;
let ddYear1 = $('#ddYear1');
let ddYear2 = $('#ddYear2');
let ddMonth1 = $('#ddMonth1');
let ddMonth2 = $('#ddMonth2');
let ddDay1 = $('#ddDay1');
let ddDay2 = $('#ddDay2');
ddYear1.empty();  ddYear2.empty();
ddMonth1.empty(); ddMonth2.empty();
ddDay1.empty();   ddDay2.empty();

let selDay1, selDay2, selMo1, selMo2, selYr1, selYr2, selDate1, selDate2, selScene1, selScene2, latestScene;
selDay1 = selDay2 = selMo1 = selMo2 = selYr1 = selYr2 = selDate1 = selDate2 = selScene1 = selScene2 = latestScene = '';
let sceneDates = [];
let sceneNames = [];
let YRS = [];
let mon = '';
let mon1 = '';
let mon2 = '';
let opac = 0.8;
let olay1 = [];
let olay2 = [];


/* Preview Scenes */
$('#preview1').click(function() { 
   if ($('input[name=preview1]').is(':checked')) {
      if(olay1) map.removeLayer(olay1);
      showScene1();
   } else {
     if(olay1) map.removeLayer(olay1);
   }
});
$('#preview2').click(function() { 
   if ($('input[name=preview2]').is(':checked')) {
      if(olay2) map.removeLayer(olay2);
      showScene2();
   } else {
      if(olay2) map.removeLayer(olay2);
   }
});

function showScene1() {
      olay1 = L.leafletGeotiff(
         url="https://rangesat.org/api/raster/Zumwalt/" + selScene1 + "/biomass/?ranches=['" + usrRanch + "']",
         options={ band: 0,
                name: 'BIOMASS',
                displayMin: 2,
                displayMax: 280,
                colorScale: 'biomasscolors',
                clampLow: false,
                clampHigh: true
         }
      ).addTo(map).setOpacity(opac);
}
function showScene2() {
      olay2 = L.leafletGeotiff(
         url="https://rangesat.org/api/raster/Zumwalt/" + selScene2 + "/biomass/?ranches=['" + usrRanch + "']",
         options={ band: 0,
                name: 'BIOMASS',
                displayMin: 2,
                displayMax: 280,
                colorScale: 'biomasscolors',
                clampLow: false,
                clampHigh: true
         }
      ).addTo(map).setOpacity(opac);
}

function refreshScene() {
   const updateScene1 = callback => {
      for (var i = 0; i < sceneNames.length; ++i) {
         if(sceneNames[i].substring(17,25) === selDate1) 
            selScene1 = sceneNames[i];
      }
      callback ({ text: selScene1 })
   }
   updateScene1(newScene1 => {
      selScene1 = newScene1.text;
      $('#selScene1').html(selScene1);
   })

   const updateScene2 = callback => {
      for (var i = 0; i < sceneNames.length; ++i) {
         if(sceneNames[i].substring(17,25) === selDate2) 
            selScene2 = sceneNames[i];
      }
      callback ({ text: selScene2 })
   }
   updateScene2(newScene2 => {
      selScene2 = newScene2.text;
      $('#selScene2').html(selScene2);
   })
}

function updateMap() {
   var diffUrl = "https://rangesat.org/api/raster-processing/difference/Zumwalt/biomass/?product_id=" + selScene1 + "&product_id2=" + selScene2 + "&ranches=['" + usrRanch + "']";
   console.log('Diff URL: ' + diffUrl);
   olay = L.leafletGeotiff(
         url=diffUrl,
         options={ band: 0,
                name: 'BIOMASS',
                displayMin: -0.99,
                displayMax: 0.99,
                colorScale: 'biomasscolors',
                clampLow: false,
                clampHigh: false
         }
      ).addTo(map).setOpacity(opac);

//   olay.setColorScale('biomasscolors');
//   $('#colorScaleImage').attr('src',olay.colorScaleData);

   $('#downloadScene').attr('href',diffUrl);

}


/* On CALC BUTTON click */
$('#calc-btn').click(function() {
   map.removeLayer(olay);
   map.removeLayer(olay1); $('#preview1').prop('checked', false);
   map.removeLayer(olay2); $('#preview2').prop('checked', false);
   map.closePopup();
   $('#rasterValue').html("__");
   updateMap();
});

/* Adjust opacity of landsat raster */
$('#opacitySlider').change(function() {
   opac = $(this).val();
   opac = opac/100;
   olay.setOpacity(opac);
});

/* On ranch select change */
$('#ddRanch').change(function() {
   usrRanch = $(this).val();
   if(usersRanch) { map.removeLayer(usersRanch); }   // clear existing ranch
   updateRanch();
   refreshScene();
   map.removeLayer(olay1); $('#preview1').prop('checked', false);
   map.removeLayer(olay2); $('#preview2').prop('checked', false);
   if(olay) map.removeLayer(olay);
});

/*----------------------------
 * ON CHANGES TO SCENE DATE #1 
 *----------------------------*/

/* Changes to DAY1 */
$('#ddDay1').change(function() {
   map.removeLayer(olay1); $('#preview1').prop('checked', false);
   selDay1 = $(this).val();
   $('#ddDay1 option').each(function(){
     if ($(this).val() == selDay1) {
        $(this).attr('selected','selected');
     } else {
        $(this).removeAttr('selected');
     }
   });
   selYr1 = $('#ddYear1 option:selected').val();
   selMo1 = $('#ddMonth1 option:selected').val();
   selDate1 = selYr1 + selMo1 + selDay1;  
});

/* Changes to MONTH1 */
$('#ddMonth1').change(function() {
   selMo1 = $(this).val();
   $('#ddMonth1 option').each(function(){
      if ($(this).val() == selMo1) {
          $(this).attr('selected','selected');
      } else {
          $(this).removeAttr('selected');
      }
   });
   ddDay1.empty(); 
   var optsDay1 = '';
   for ( var i=0; i < sceneDates.length; i++ ) {
      if(sceneDates[i].substring(0,4) === selYr1 && sceneDates[i].substring(4,6) === selMo1) {
         optsDay1 += '<option value="'+ sceneDates[i].substring(6,8) + '">' + sceneDates[i].substring(6,8) + '</option>';
      }
   }
   $('#ddDay1').append(optsDay1);
   /* above has duplicates, so remove them */
   var usedDays1 = {};
   $("#ddDays1 > option").each(function () {
      if(usedDays1[this.text]) {
        $(this).remove();
      } else {
        usedDays1[this.text] = this.value;
      }
   });
   $('#ddDay1 option:eq(0)').attr('selected','selected');
   selDay1 = $('#ddDay1 option:selected').val();
   selYr1 = $('#ddYear1 option:selected').val();
   selDate1 = selYr1 + selMo1 + selDay1;  

});

/* Changes to YEAR1 */
$('#ddYear1').change(function() {
   selYr1 = $(this).val();
   $('#ddYear1 option').each(function(){
      if ($(this).val() == selYr1) {
         $(this).attr('selected','selected');
      } else {
         $(this).removeAttr('selected');
      }
   });
   ddMonth1.empty();     // set Month dropdown to empty
   ddDay1.empty();     // set Day dropdown to empty

   /* rebuild MONTH1 list using YR1 as filter */
   var optsMo1 = '';
   for ( var i=0; i < sceneDates.length; i++ ) {
      if(sceneDates[i].substring(0,4) === selYr1) {

         switch ( sceneDates[i].substring(4,6) ) {
              case '01': mon1='Jan'; break;
              case '02': mon1='Feb'; break;
              case '03': mon1='Mar'; break;
              case '04': mon1='Apr'; break;
              case '05': mon1='May'; break;
              case '06': mon1='Jun'; break;
              case '07': mon1='Jul'; break;
              case '08': mon1='Aug'; break;
              case '09': mon1='Sep'; break;
              case '10': mon1='Oct'; break;
              case '11': mon1='Nov'; break;
              case '12': mon1='Dec'; break;
         }

         optsMo1 += '<option value="'+ sceneDates[i].substring(4,6) + '">' + mon1 + '</option>';
      }
   }
   $('#ddMonth1').append(optsMo1);
   /* the above has duplicates, so run the following to remove them */
   var usedMonths1 = {};
   $("#ddMonth1 > option").each(function () {
      if(usedMonths1[this.text]) {
         $(this).remove();
      } else {
         usedMonths1[this.text] = this.value;
      }
   });  
   $('#ddMonth1 option:eq(0)').attr('selected','selected');
   selMo1 = $('#ddMonth1 option:selected').val();

   /* rebuild DAY list using YR and MONTH as filter */
   var optsDay1 = '';
   for ( var i=0; i < sceneDates.length; i++ ) {
      if(sceneDates[i].substring(0,4) === selYr1 && sceneDates[i].substring(4,6) === selMo1) {
         optsDay1 += '<option value="'+ sceneDates[i].substring(6,8) + '">' + sceneDates[i].substring(6,8) + '</option>';
      }
   }
   $('#ddDay1').append(optsDay1);
   /* the above has duplicates, so run the following to remove them */
   var usedDay1 = {};
   $("#ddDay1 > option").each(function () {
      if(usedDay1[this.text]) {
         $(this).remove();
      } else {
         usedDay1[this.text] = this.value;
      }
   });
   $('#ddDay1 option:eq(0)').attr('selected','selected');
   selDay1 = $('#ddDay1 option:selected').val();

   selDate1 = selYr1 + selMo1 + selDay1;

});  

/* Changes to Scene 1 selectors */
$('#ddDay1, #ddMonth1, #ddYear1').change(function() {
   refreshScene();
   map.removeLayer(olay1); $('#preview1').prop('checked', false);
   if(olay) map.removeLayer(olay);
});

/* ---------------------------- 
 * ON CHANGES TO SCENE DATE #2 
 * ---------------------------- */
/* Changes to DAY2 */
$('#ddDay2').change(function() {
   selDay2 = $(this).val();
   $('#ddDay2 option').each(function(){
     if ($(this).val() == selDay2) {
        $(this).attr('selected','selected');
     } else {
        $(this).removeAttr('selected');
     }
   });
   selYr2 = $('#ddYear2 option:selected').val();
   selMo2 = $('#ddMonth2 option:selected').val();
   selDate2 = selYr2 + selMo2 + selDay2;
});

/* Changes to MONTH2 */
$('#ddMonth2').change(function() {
   selMo2 = $(this).val();
   $('#ddMonth2 option').each(function(){
      if ($(this).val() == selMo2) {
          $(this).attr('selected','selected');
      } else {
          $(this).removeAttr('selected');
      }
   });
   ddDay2.empty();
   var optsDay2 = '';
   for ( var i=0; i < sceneDates.length; i++ ) {
      if(sceneDates[i].substring(0,4) === selYr2 && sceneDates[i].substring(4,6) === selMo2) {
         optsDay2 += '<option value="'+ sceneDates[i].substring(6,8) + '">' + sceneDates[i].substring(6,8) + '</option>';
      }
   }
   $('#ddDay2').append(optsDay2);
   /* above has duplicates, so remove them */
   var usedDays2 = {};
   $("#ddDays2 > option").each(function () {
      if(usedDays2[this.text]) {
        $(this).remove();
      } else {
        usedDays2[this.text] = this.value;
      }
   });
   $('#ddDay2 option:eq(0)').attr('selected','selected');
   selDay2 = $('#ddDay2 option:selected').val();
   selYr2 = $('#ddYear2 option:selected').val();
   selDate2 = selYr2 + selMo2 + selDay2;

});

/* Changes to YEAR2 */
$('#ddYear2').change(function() {
   selYr2 = $(this).val();
   $('#ddYear2 option').each(function(){
      if ($(this).val() == selYr2) {
         $(this).attr('selected','selected');
      } else {
         $(this).removeAttr('selected');
      }
   });
   ddMonth2.empty();     // set Month dropdown to empty
   ddDay2.empty();     // set Day dropdown to empty

   /* rebuild MONTH2 list using YR2 as filter */
   var optsMo2 = '';
   for ( var i=0; i < sceneDates.length; i++ ) {
      if(sceneDates[i].substring(0,4) === selYr2) {

         switch ( sceneDates[i].substring(4,6) ) {
              case '01': mon2='Jan'; break;
              case '02': mon2='Feb'; break;
              case '03': mon2='Mar'; break;
              case '04': mon2='Apr'; break;
              case '05': mon2='May'; break;
              case '06': mon2='Jun'; break;
              case '07': mon2='Jul'; break;
              case '08': mon2='Aug'; break;
              case '09': mon2='Sep'; break;
              case '10': mon2='Oct'; break;
              case '11': mon2='Nov'; break;
              case '12': mon2='Dec'; break;
         }

         optsMo2 += '<option value="'+ sceneDates[i].substring(4,6) + '">' + mon2 + '</option>';
      }
   }
   $('#ddMonth2').append(optsMo2);
   /* the above has duplicates, so run the following to remove them */
   var usedMonths2 = {};
   $("#ddMonth2 > option").each(function () {
      if(usedMonths2[this.text]) {
         $(this).remove();
      } else {
         usedMonths2[this.text] = this.value;
      }
   });
   $('#ddMonth2 option:eq(0)').attr('selected','selected');
   selMo2 = $('#ddMonth2 option:selected').val();

   /* rebuild DAY list using YR and MONTH as filter */
   var optsDay2 = '';
   for ( var i=0; i < sceneDates.length; i++ ) {
      if(sceneDates[i].substring(0,4) === selYr2 && sceneDates[i].substring(4,6) === selMo2) {
         optsDay2 += '<option value="'+ sceneDates[i].substring(6,8) + '">' + sceneDates[i].substring(6,8) + '</option>';
      }
   }
   $('#ddDay2').append(optsDay2);
   /* the above has duplicates, so run the following to remove them */
   var usedDay2 = {};
   $("#ddDay2 > option").each(function () {
      if(usedDay2[this.text]) {
         $(this).remove();
      } else {
         usedDay2[this.text] = this.value;
      }
   });
   $('#ddDay2 option:eq(0)').attr('selected','selected');
   selDay2 = $('#ddDay2 option:selected').val();

   selDate2 = selYr2 + selMo2 + selDay2;

});

/* Changes to Scene 2 selectors */
$('#ddDay2, #ddMonth2, #ddYear2').change(function() {
   refreshScene();
   map.removeLayer(olay2); $('#preview2').prop('checked', false);
   if(olay) map.removeLayer(olay);
});

/* END SCENE DATE #2 SELECTION BUILDER */




/*----------------------------
 * Fetch latest Landsat Scene 
 *----------------------------*/

/* Use CALLBACK approach */
const latestLandsat = callback => {

   fetch('https://rangesat.org/api/scenemeta/Zumwalt/?pasture_coverage_threshold=0.5&filter=latest')
      .then(response => {
         return response.json()
      })
      .then(data => {
         /* console.log('LATEST SCENE: ' + data); */
         callback ({ text: data })
      })
      .catch(err => {
         console.log('Error loading lastest Zumwalt Landsat scene.');
      })

}

latestLandsat(initScene => {
   /* console.log("CALLBACK Latest Scene: "+initScene.text); */
   latestScene = initScene.text;
   loadScenesList();
})

/*----------------------------------
 * ON INITIAL PAGE LOAD:           
 * Get list of all Landsat Scenes   
 * Use latest scene to set defaults 
 *----------------------------------*/

function loadScenesList() {

   /* This url contains names of scenes in Zumwalt */
   const url_scenes = 'https://rangesat.org/api/scenemeta/Zumwalt/?pasture_coverage_threshold=0.5';

   /* Populate dropdown with list of scenes */
   $.getJSON(url_scenes, function (data) {
      $.each(data, function (key, entry) {
         var ddate = entry.split("_");
         var yyyymmdd = ddate[3];
         var yr = ddate[3].substring(0,4);
         sceneDates.push(yyyymmdd);
         sceneNames.push(entry);   
         YRS.push(yr);
      });

      const sortSceneDates = sceneDates.sort();

      const sortYrs = YRS.sort();            // sort scene years
      const revYrs = sortYrs.reverse();      // reverse years (descending)
      const uniqYrs = (value, index, self) => {
         return self.indexOf(value) === index     // remove duplicates
      };
      const finalYrs = revYrs.filter(uniqYrs);   // this is the years list we want


      /* set dropdown options for YEAR */
      var optsYr = '';
      for (var i=0; i < finalYrs.length; i++){
         optsYr += '<option value="'+ finalYrs[i] + '">' + finalYrs[i] + '</option>';
      }
      $('#ddYear1, #ddYear2').append(optsYr);

      /* set initial year to be from latest scene */
      $('#ddYear1 option, #ddYear2 option').each(function(){
         if ($(this).val() == latestScene.substring(17,21))
             $(this).attr('selected','selected');
      });
      selYr1 = selYr2 = latestScene.substring(17,21);


      /* set dropdown options for MONTH filtered by initial YR */
      var optsMo = '';
      for ( var i=0; i < sceneDates.length; i++ ) {
         if(sceneDates[i].substring(0,4) === latestScene.substring(17,21)) {

	  switch ( sceneDates[i].substring(4,6) ) {
              case '01': mon='Jan'; break;
              case '02': mon='Feb'; break;
              case '03': mon='Mar'; break;
              case '04': mon='Apr'; break;
              case '05': mon='May'; break;
              case '06': mon='Jun'; break;
              case '07': mon='Jul'; break;
              case '08': mon='Aug'; break;
              case '09': mon='Sep'; break;
              case '10': mon='Oct'; break;
              case '11': mon='Nov'; break;
              case '12': mon='Dec'; break;
         }

         optsMo += '<option value="'+ sceneDates[i].substring(4,6) + '">' + mon + '</option>';

         /* optsMo += '<option value="'+ sceneDates[i].substring(4,6) + '">' + sceneDates[i].substring(4,6) + '</option>'; */
         }
      }
      $('#ddMonth1, #ddMonth2').append(optsMo);
      /* the above may have duplicates, so run the following to remove them */
      var usedMonths1 = {};
      var usedMonths2 = {};
      $('#ddMonth1 > option').each(function () {
         if(usedMonths1[this.text]) {
            $(this).remove();
         } else {
            usedMonths1[this.text] = this.value;
         }
      });
      $('#ddMonth2 > option').each(function () {
         if(usedMonths2[this.text]) {
            $(this).remove();
         } else {
            usedMonths2[this.text] = this.value;
         }
      });
      /* set initial month to be from latest scene */
      $('#ddMonth1 option, #ddMonth2 option').each(function(){
         if ($(this).val() == latestScene.substring(21,23))
             $(this).attr('selected','selected');
      });
 

      /* set dropdown options for DAY filtered by initial MONTH and YEAR */
      var optsDay = '';
      for ( var i=0; i < sceneDates.length; i++ ) {
         if(sceneDates[i].substring(0,4) === latestScene.substring(17,21) && sceneDates[i].substring(4,6) === latestScene.substring(21,23)) {
            optsDay += '<option value="'+ sceneDates[i].substring(6,8) + '">' + sceneDates[i].substring(6,8) + '</option>';
         }
      }
      $('#ddDay1, #ddDay2').append(optsDay);
      /* the above may have duplicates, so run the following to remove them */
      var usedDays1 = {};
      var usedDays2 = {};
      $('#ddDay1 > option').each(function () {
         if(usedDays1[this.text]) {
            $(this).remove();
         } else {
            usedDays1[this.text] = this.value;
         }
      });
      $('#ddDay2 > option').each(function () {
         if(usedDays2[this.text]) {
            $(this).remove();
         } else {
            usedDays2[this.text] = this.value;
         }
      });
      /* set initial day to be from latest scene */
      $('#ddDay1 option, #ddDay2 option').each(function(){
         if ($(this).val() == latestScene.substring(23,25))
             $(this).attr('selected','selected');
      });

      /* console.log("Init Date Selected: " + latestScene.substring(17,25)); */

      //$('#dateConcat').html(latestScene.substring(17,25));
  
      selScene1 = selScene2 = latestScene;
      $('#selScene1').html(selScene1);
      $('#selScene2').html(selScene2);
      /* console.log('SET latest scene to selected scene, run map update'); */

   });

}

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


/* Custom Biomass color scales */
plotty.addColorScale("biomasscolors",   // identifier
    ["#9e0142", "#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd", "#5e4fa2"],  // color steps
    [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]);    // percentage steps

olay = L.leafletGeotiff(
    //url='https://rangesat.org/api/raster-processing/difference/Zumwalt/biomass/?product_id=LC08_L1TP_043028_20200428_20200509_01_T1&product_id2=LC08_L1TP_043028_20200412_20200422_01_T1',
    url='https://rangesat.org/api/raster-processing/difference/Zumwalt/biomass/?product_id=' + selScene1 + '&product_id2=' + selScene2,
    options={ band: 0,
           name: 'BIOMASS',
           displayMin: -0.99,
           displayMax: 0.99,
           colorScale: 'biomasscolors',
           clampLow: false,
           clampHigh: true
    }
).addTo(map).setOpacity(opac);

olay.setColorScale('biomasscolors');
$('#colorScaleImage').attr('src',olay.colorScaleData);

/* Add layer toggle controller */
L.control.layers(baseLayers).addTo(map);

/* Disable scroll wheel zoom */
map.scrollWheelZoom.disable();


/* Map click handler to build popup */
function clickHandler(e) {

  var rasterValue = olay.getValueAtLatLng(e.latlng.lat,e.latlng.lng).toFixed(1);
  rasterValue = rasterValue * 100;
  if(rasterValue > 100 || rasterValue < -100) { rasterValue = 'N/A'; }

  //rasterValue = (rasterValue * 8.92179122).toFixed(0);  // convert biomass from g/m2 to lbs/acre, round to integer
  //if(rasterValue < 0) { rasterValue = 'N/A'; } else { rasterValue = rasterValue + ' lbs/acre'; }
  
  $("#rasterValue").html(rasterValue);

  var html = "<p><strong>Relative difference:</strong> " + rasterValue + "%</p>";

  map.openPopup(html, e.latlng, {
    offset: L.point(0, 0)
  });


}


map.on('click', clickHandler);


/*--------------------------------------
 * Load/update geojson ranch boundaries
 *--------------------------------------*/

updateRanch();  // on intial page load

function updateRanch() {

  function loadJSONFile(callback) {

    var xmlobj = new XMLHttpRequest();
    xmlobj.overrideMimeType("application/json");
    xmlobj.open('GET', 'https://rangesat.org/api/geojson/Zumwalt/' + usrRanch, false); // False = synchronous loading.
    xmlobj.onreadystatechange = function () {
          if (xmlobj.readyState == 4 && xmlobj.status == "200") {
            callback(xmlobj.responseText);
          }
    };

    xmlobj.send(null);
  }

  loadJSONFile(function(response) {
    ranch = JSON.parse(response);
  
    /* Add pasture boundaries to map */
    usersRanch = L.geoJson(ranch, {
     style: {
        color: 'white', //bndyColor,
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
        //     pop = "<tr><td><strong>Area: </strong></td><td>" + feature.properties.Ranch + "</td></tr><tr><td><strong>Pasture: </strong></td><td>" + feature.properties.PASTURE +  "</td></tr><tr><td><strong>Acres: </strong></td><td>" + acres + "</td></tr></table>"
           }
        });
     },
     interactive: true  // false allows map click to pass through polygon and return raster value
    }).addTo(map);

    map.fitBounds(usersRanch.getBounds());  // zooms to user's ranch

  });
} // close updateRanch();
