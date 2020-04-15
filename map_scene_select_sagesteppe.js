/* This script handles Landsat scene selections.
 * It is used with map_pixel_rcr.js and map_pixel_auth_sage.js
 */

/*-----------------------------------------
 * Initialize dropdowns, arrays, variables 
 *-----------------------------------------*/

let ddYear = $('#ddYear');
let ddMonth = $('#ddMonth');
let ddDay = $('#ddDay');
let mon = '';
ddYear.empty();
ddMonth.empty();
ddDay.empty();

let indicator = '';
let selDay = '';
let selMo = '';
let selYr = '';
let selDate = '';
let selScene = '';
let latestScene = '';
let sceneDates = [];
let sceneNames = [];
let YRS = [];


function refreshScene() {

   const updateScene = callback => {
      for (var i = 0; i < sceneNames.length; ++i) {
         if(sceneNames[i].substring(17,25) === selDate) 
            selScene = sceneNames[i];
      }
      callback ({ text: selScene })
   }

   updateScene(newScene => {
      selScene = newScene.text;
      updateMap();
   })

}

/*-----------------------------
 * ON CHANGES TO VEG INDICATOR 
 *-----------------------------*/

$('#indicator').change(function() {
   indicator = $(this).val();
   map.removeLayer(olay);
   updateMap();
});

/*--------------------
 * ON CHANGES TO DATE 
 *--------------------*/

/* Changes to DAY */
$('#ddDay').change(function() {
   selDay = $(this).val();
   $('#ddDay option').each(function(){
     if ($(this).val() == selDay) {
        $(this).attr('selected','selected');
     } else {
        $(this).removeAttr('selected');
     }
   });
   selYr = $('#ddYear option:selected').val();
   selMo = $('#ddMonth option:selected').val();
   selDate = selYr + selMo + selDay;  
});

/* Changes to MONTH */
$('#ddMonth').change(function() {
   selMo = $(this).val();
   $('#ddMonth option').each(function(){
      if ($(this).val() == selMo) {
          $(this).attr('selected','selected');
      } else {
          $(this).removeAttr('selected');
      }
   });
   ddDay.empty(); 
   var optsDay = '';
   for ( var i=0; i < sceneDates.length; i++ ) {
      if(sceneDates[i].substring(0,4) === selYr && sceneDates[i].substring(4,6) === selMo) {
         optsDay += '<option value="'+ sceneDates[i].substring(6,8) + '">' + sceneDates[i].substring(6,8) + '</option>';
      }
   }
   $('#ddDay').append(optsDay);
   /* above has duplicates, so remove them */
   var usedDays = {};
   $("#ddDays > option").each(function () {
      if(usedDays[this.text]) {
        $(this).remove();
      } else {
        usedDays[this.text] = this.value;
      }
   });
   $('#ddDay option:eq(0)').attr('selected','selected');
   selDay = $('#ddDay option:selected').val();
   selYr = $('#ddYear option:selected').val();
   selDate = selYr + selMo + selDay;  

});

/* Changes to YEAR */
$('#ddYear').change(function() {
   selYr = $(this).val();
   $('#ddYear option').each(function(){
      if ($(this).val() == selYr) {
         $(this).attr('selected','selected');
      } else {
         $(this).removeAttr('selected');
      }
   });
   ddMonth.empty();     // set Month dropdown to empty
   ddDay.empty();     // set Day dropdown to empty

   /* rebuild MONTH list using YR as filter */
   var optsMo = '';
   for ( var i=0; i < sceneDates.length; i++ ) {
      if(sceneDates[i].substring(0,4) === selYr) {

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
      }
   }
   $('#ddMonth').append(optsMo);
   /* the above has duplicates, so run the following to remove them */
   var usedMonths = {};
   $("#ddMonth > option").each(function () {
      if(usedMonths[this.text]) {
         $(this).remove();
      } else {
         usedMonths[this.text] = this.value;
      }
   });  
   $('#ddMonth option:eq(0)').attr('selected','selected');
   selMo = $('#ddMonth option:selected').val();

   /* rebuild DAY list using YR and MONTH as filter */
   var optsDay = '';
   for ( var i=0; i < sceneDates.length; i++ ) {
      if(sceneDates[i].substring(0,4) === selYr && sceneDates[i].substring(4,6) === selMo) {
         optsDay += '<option value="'+ sceneDates[i].substring(6,8) + '">' + sceneDates[i].substring(6,8) + '</option>';
      }
   }
   $('#ddDay').append(optsDay);
   /* the above has duplicates, so run the following to remove them */
   var usedDay = {};
   $("#ddDay > option").each(function () {
      if(usedDay[this.text]) {
         $(this).remove();
      } else {
         usedDay[this.text] = this.value;
      }
   });
   $('#ddDay option:eq(0)').attr('selected','selected');
   selDay = $('#ddDay option:selected').val();

   selDate = selYr + selMo + selDay;

});  

/* For ANY change to dropdowns */
$('select').change(function() {
//$('#ddYear, #ddMonth, #ddDay').change(function() {
   map.removeLayer(olay);
   map.closePopup();
   $('#rasterValue').html("?");
   $('#dateConcat').html(selYr + selMo + selDay);
   refreshScene();
});


/*----------------------------
 * Fetch latest Landsat Scene 
 *----------------------------*/

/* Use CALLBACK approach */
const latestLandsat = callback => {

   fetch('https://rangesat.nkn.uidaho.edu/api/scenemeta/SageSteppe/?pasture_coverage_threshold=0.5&filter=latest')
      .then(response => {
         return response.json()
      })
      .then(data => {
         /* console.log('LATEST SCENE: ' + data); */
         callback ({ text: data })
      })
      .catch(err => {
         console.log('Error loading lastest SageSteppe Landsat scene.');
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

   /* This url contains names of scenes in SageSteppe */
   const url_scenes = 'https://rangesat.nkn.uidaho.edu/api/scenemeta/SageSteppe/?pasture_coverage_threshold=0.5';

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
      $('#ddYear').append(optsYr);

      /* set initial year to be from latest scene */
      $('#ddYear option').each(function(){
         if ($(this).val() == latestScene.substring(17,21))
             $(this).attr('selected','selected');
      });
      selYr = latestScene.substring(17,21);


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
      $('#ddMonth').append(optsMo);
      /* the above may have duplicates, so run the following to remove them */
      var usedMonths = {};
      $("#ddMonth > option").each(function () {
         if(usedMonths[this.text]) {
            $(this).remove();
         } else {
            usedMonths[this.text] = this.value;
         }
      });
      /* set initial month to be from latest scene */
      $('#ddMonth option').each(function(){
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
      $('#ddDay').append(optsDay);
      /* the above may have duplicates, so run the following to remove them */
      var usedDays = {};
      $("#ddDays > option").each(function () {
         if(usedDays[this.text]) {
            $(this).remove();
         } else {
            usedDays[this.text] = this.value;
         }
      });
      /* set initial day to be from latest scene */
      $('#ddDay option').each(function(){
         if ($(this).val() == latestScene.substring(23,25))
             $(this).attr('selected','selected');
      });

      /* console.log("Init Date Selected: " + latestScene.substring(17,25)); */

      $('#dateConcat').html(latestScene.substring(17,25));
  
      selScene = latestScene;
      indicator = 'biomass';
      /* console.log('SET latest scene to selected scene, run map update'); */

      updateMap();

   });

}

