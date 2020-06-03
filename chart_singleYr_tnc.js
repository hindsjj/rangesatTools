// Define variables
// Set defaults

const baseUrl = 'https://rangesat.org/api/'; 
const geoj = 'geojson/';
const gmet = 'gridmet/';
const ps = 'pasturestats/'
const sy = 'single-year/';
const sym = 'single-year-monthly/';
const sp = 'seasonal-progression/';
const ap = 'annual-progression/';
const apm = 'annual-progression-monthly/';
const loc = 'Zumwalt/';
var today = new Date();
var ranch;
let usrRanch ='TNC';
let pasture = '';
let measure = 'biomass';
let measure_caps = 'Biomass';
let intv = 'grazing';
let clim = 'ppt';
let moStart = '2.5';
let moEnd = '10.5';
let varId = '';
let varVal = '';
//let yr = today.getFullYear();
let yr = 2019;
let date = [];
let pct10 = [];
let pct75 = [];
let pct90 = [];
let ci90 = [];
let mean = [];
let sd = [];
let date_sp = [];
let pct10_sp = [];
let pct75_sp = [];
let pct90_sp = [];
let ci90_sp = [];
let mean_sp = [];
let sd_sp = [];
var xmlhttp = new XMLHttpRequest();
var xmlhttp1 = new XMLHttpRequest();
var xmlhttp2 = new XMLHttpRequest();
let url ='';
let urlDL ='';
let gmetUrlSy ='';
let gmetUrlMy ='';
let spUrl ='';
let units = '(lbs/acre)';


//------------------------------//
// Load landowner pasture names //
// Build pasture dropdown list  //
//------------------------------//

function loadJSONFile(callback) {

   var xmlobj = new XMLHttpRequest();
   xmlobj.overrideMimeType('application/json');
   xmlobj.open('GET', baseUrl + geoj + loc + usrRanch, false); // change true to false for syncronous loading
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
   //console.log(ranch.features.length);

   // Build Pasture Dropdown List: 
   var p_opts = '';
   for (var i = 0; i < ranch.features.length; i++) {
      p_opts += '<option value="' + ranch.features[i].properties.PASTURE + '">' + ranch.features[i].properties.PASTURE + '</option>';
   }
   $('#ddPasture').append(p_opts);

   // Sort options
   $("#ddPasture").html($("#ddPasture option").sort(function (a, b) {
      return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
   }));

   // Prepend dropdown help text
   $("#ddPasture").prepend("<option value='' disabled='disabled'>- Select a pasture - </option>").val('');

   // Set default pasture selection
   pasture = $('#ddPasture option:eq(1)').val();
   $("#ddPasture option:eq(1)").attr('selected','selected');

});


//----------------------//
// Build Date Dropdowns //
//----------------------//

// Years, beginning 1982
//for (i = new Date().getFullYear(); i > 1981; i--) {
for (i = 2020; i > 1981; i--) {
   $('#ddYear').append($('<option />').val(i).html(i));
}
$("#ddYear option:eq(1)").attr('selected','selected');


//-----------------------------//
// Process on-change events    //
// ----------------------------//

$('#q1').click(function(){
   $('#indicator-help').toggle(500);
});

$('#radInterval[name=radInterval]').change(function() {
   intv = $(this).val();
   if(intv == 'grazing') { moStart = '2.5'; moEnd = '10.5'; };
   if(intv == 'calendar'){ moStart = '-0.5'; moEnd = '12'; };
});

$('#radClimate[name=radClimate]').change(function() {
   clim = $(this).val();
});


$('select').change(function() {
   varId = $(this).attr('id');
   varVal = $(this).val();
   $('#' + varId + ' option').each(function(){
      if ($(this).val() == varVal) {
          $(this).attr('selected','selected');
      } else {
          $(this).removeAttr('selected');
      }
   });
   switch(varId) {
      case "ddYear":
         yr = varVal;
         break;
      case "ddPasture":
         pasture = varVal;
         break;
      case "ddMeasure":
         measure = varVal;
         measure_caps = measure.toUpperCase();
         if (measure_caps == 'BIOMASS') { measure_caps = 'Biomass'; }
         if (varVal == 'biomass') { units = '(lbs/acre)'; } else { units = ''; }
         if (measure_caps == 'NBR2') { measure_caps = 'NDTI'; }
         break;
      default: 
         //console.log("NOTHING TO DO HERE");
   }
});


$('#ddPasture, #ddMeasure, #radInterval, #radClimate, #ddYear').change(function() {
   updateGridmet();
   updateSeasonProg();
   updateStats();
});


//----------------//
// Update Gridmet //
//----------------//

updateGridmet();  // on initial page load

function updateGridmet() {

   // Single Year Monthly: gridmet monthly-aggregated data for selected year
   gmetUrlSy = baseUrl + gmet + sym + loc + usrRanch + "/" + escape(pasture) + "/?year=" + yr + "&units=English";
   //console.log('gridmet URL sym: ' + gmetUrlSy);

   // Annual Progression Monthly: gridmet monthly-aggregated data for multiple years
   gmetUrlMy = baseUrl + gmet + apm + loc + usrRanch + "/" + escape(pasture) + "/?year=" + yr + "&units=English";
   //console.log('gridmet URL apm: ' + gmetUrlMy);

   xmlhttp1.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          var gmetArrSy = JSON.parse(this.responseText);
          gmetFuncSy(gmetArrSy);
      }
   };
   xmlhttp1.open("GET", gmetUrlSy, false); // true is async, false is sync loading
   xmlhttp1.send();

   xmlhttp2.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          var gmetArrMy = JSON.parse(this.responseText);
          gmetFuncMy(gmetArrMy);
      }
   };
   xmlhttp2.open("GET", gmetUrlMy, false); 
   xmlhttp2.send();

}

// SINGLE (SELECTED) YEAR MONTHLY AVG
function gmetFuncSy(arr) {   

   // reset arrays
   sy_months = [];
   sy_bi = [];		// burn index
   sy_pdsi = [];	// Palmar's drought severity index
   sy_pet = [];		// potential evapotranspiration
   sy_pr = [];		// precipitation
   sy_cum_pr = [];	// cumulative precipitation
   sy_srad = [];	// surface downwelling shortware flux in air
   sy_tmmn = [];	// air temp minimum
   sy_tmmx = [];	// air temp maximum
   sy_climVar = [];  

   // load new arrays
   for( var i = 0; i < arr.months.length; i++ ) {
      sy_months.push(arr.months[i]);
      //sy_bi.push(arr.bi[i]);
      //sy_pdsi.push(arr.pdsi[i]);
      sy_pet.push(arr.pet[i]);
      sy_pr.push(arr.pr[i]);
      //sy_cum_pr.push(arr.cum_pr[i]);
      //sy_srad.push(arr.srad[i]);
      sy_tmmn.push(arr.tmmn[i]);
      sy_tmmx.push(arr.tmmx[i]);
   }

   if(clim == 'ppt')  { sy_climVar = sy_pr;   sy_label_short = "Precip";   sy_label_long = "Precipitation (inches)"; };
   if(clim == 'pet')  { sy_climVar = sy_pet;   sy_label_short = "Potential ET";   sy_label_long = "Potential EvapoTranspiration (inches)"; };
   if(clim == 'tmin') { sy_climVar = sy_tmmn; sy_label_short = "Min Temp"; sy_label_long = "Min Temperature (°F)"; };
   if(clim == 'tmax') { sy_climVar = sy_tmmx; sy_label_short = "Max Temp"; sy_label_long = "Max Temperature (°F)"; };

}

// ANNUAL PROGRESSION (HISTORIC AVG) MONTHLY 
function gmetFuncMy(arr) {

   // reset arrays
   my_months = [];
   my_bi = [];		// burn index
   my_pdsi = [];		// Palmar's drought severity index
   my_pet = [];		// potential evapotranspiration
   my_pr = [];		// precipitation
   my_cum_pr = [];	// cumulative precipitation
   my_srad = [];		// surface downwelling shortware flux in air
   my_tmmn = [];		// air temp minimum
   my_tmmx = [];		// air temp maximum
   my_climVar = [];

   // load new arrays
   for( var i = 0; i < arr.months.length; i++ ) {
      //my_months.push(arr.months[i]);
      //my_bi.push(arr.bi[i]);
      //my_pdsi.push(arr.pdsi[i]);
      my_pet.push(arr.pet[i]);
      my_pr.push(arr.pr[i]);
      //my_cum_pr.push(arr.cum_pr[i]);
      //my_srad.push(arr.srad[i]);
      my_tmmn.push(arr.tmmn[i]);
      my_tmmx.push(arr.tmmx[i]);
   }

   if(clim == 'ppt')  { my_climVar = my_pr;   climColorSy = 'cyan'; climColorMy = 'lightskyblue'; };
   if(clim == 'pet')  { my_climVar = my_pet;   climColorSy = 'limegreen'; climColorMy = 'darkgreen'; };
   if(clim == 'tmin') { my_climVar = my_tmmn; climColorSy = 'gold'; climColorMy = 'goldenrod'; };
   if(clim == 'tmax') { my_climVar = my_tmmx; climColorSy = 'lightcoral'; climColorMy = 'indianred'; };
 
}

//-----------------------------//
// Update Seasonal Progression //
//-----------------------------//

updateSeasonProg();  // on initial page load

function updateSeasonProg() {

   // seasonal progression data for selected year
   spUrl = baseUrl + ps + sp + loc + "?ranch=" + usrRanch + "&pasture=" + escape(pasture);
   //console.log('Seasonal Prog URL: ' + spUrl);

   xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          var spArr = JSON.parse(this.responseText);
          seaprogFunc(spArr);
      }
   };
   xmlhttp.open("GET", spUrl, false); // true is async, false is sync loading
   xmlhttp.send();

}

function seaprogFunc(arr2) {

   //arr2[Object.keys(arr2)[0]];
   //console.log(arr2[Object.keys(arr2)[0]][0].month);

   // reset data arrays
   //date_sp = [];
   //month_sp = [];
   pct10_sp = [];
   pct75_sp = [];
   pct90_sp = [];
   ci90_sp = [];
   mean_sp = [];
   sd_sp = [];

   for(var i = 0; i < arr2[Object.keys(arr2)[0]].length; i++) {

      switch(measure) {
         case 'biomass':
           if(arr2[Object.keys(arr2)[0]][i].biomass_10pct_gpm > 1) {
             pct10_sp.push( arr2[Object.keys(arr2)[0]][i].biomass_10pct_gpm * 8.92179122 );  // need to mult x 8.92179122 to convert gpm to lbs/acre
           } else { pct10_sp.push('null'); }
           if(arr2[Object.keys(arr2)[0]][i].biomass_75pct_gpm > 1) {
             pct75_sp.push( arr2[Object.keys(arr2)[0]][i].biomass_75pct_gpm * 8.92179122);
           } else { pct75_sp.push('null'); }
           if(arr2[Object.keys(arr2)[0]][i].biomass_90pct_gpm > 1) {
             pct90_sp.push( arr2[Object.keys(arr2)[0]][i].biomass_90pct_gpm * 8.92179122);
           } else { pct90_sp.push('null'); }
           ci90_sp.push( arr2[Object.keys(arr2)[0]][i].biomass_ci90_gpm * 8.92179122);
	   if(arr2[Object.keys(arr2)[0]][i].biomass_mean_gpm > 1) {
             mean_sp.push( arr2[Object.keys(arr2)[0]][i].biomass_mean_gpm * 8.92179122);
           } else { mean_sp.push('null'); }
           sd_sp.push( arr2[Object.keys(arr2)[0]][i].biomass_sd_gpm * 8.92179122);
           break;
         case 'ndvi':
           if(arr2[Object.keys(arr2)[0]][i].ndvi_10pct != -0.9999) {
             pct10_sp.push(arr2[Object.keys(arr2)[0]][i].ndvi_10pct);
           } else { pct10_sp.push('null'); }
           pct75_sp.push(arr2[Object.keys(arr2)[0]][i].ndvi_75pct);
           pct90_sp.push(arr2[Object.keys(arr2)[0]][i].ndvi_90pct);
           ci90_sp.push(arr2[Object.keys(arr2)[0]][i].ndvi_ci90);
           mean_sp.push(arr2[Object.keys(arr2)[0]][i].ndvi_mean);
           sd_sp.push(arr2[Object.keys(arr2)[0]][i].ndvi_sd);
           break;
         case 'nbr':
           pct10_sp.push(arr2[Object.keys(arr2)[0]][i].nbr_10pct);
           pct75_sp.push(arr2[Object.keys(arr2)[0]][i].nbr_75pct);
           pct90_sp.push(arr2[Object.keys(arr2)[0]][i].nbr_90pct);
           ci90_sp.push(arr2[Object.keys(arr2)[0]][i].nbr_ci90);
           mean_sp.push(arr2[Object.keys(arr2)[0]][i].nbr_mean);
           sd_sp.push(arr2[Object.keys(arr2)[0]][i].nbr_sd);
           break;
         case 'nbr2':
           pct10_sp.push(arr2[Object.keys(arr2)[0]][i].nbr2_10pct);
           pct75_sp.push(arr2[Object.keys(arr2)[0]][i].nbr2_75pct);
           pct90_sp.push(arr2[Object.keys(arr2)[0]][i].nbr2_90pct);
           ci90_sp.push(arr2[Object.keys(arr2)[0]][i].nbr2_ci90);
           mean_sp.push(arr2[Object.keys(arr2)[0]][i].nbr2_mean);
           sd_sp.push(arr2[Object.keys(arr2)[0]][i].nbr2_sd);
           break;
      }

   }

}

//-----------------------//
// Create/Update Stats 1 //
//-----------------------//

updateStats();  // on initial page load

function updateStats() {

   url = baseUrl + ps + sym + loc + "?ranch=" + usrRanch + "&pasture=" + escape(pasture) + "&year=" + yr;
   urlDL = url + '&units=en&drop=nbr2_10pct;nbr2_75pct;nbr2_90pct;nbr2_ci90;nbr2_mean;nbr2_sd;nbr_10pct;nbr_75pct;nbr_90pct;nbr_ci90;nbr_mean;nbr_sd&csv=True';

   $('#csv').attr('href',urlDL);
   $('#csvYr').html(yr);

   //console.log('Download URL: ' + urlDL);

   xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          var singYrArr = JSON.parse(this.responseText);
          singYrFunc(singYrArr);
      }
   };
   xmlhttp.open("GET", url, false); // true is async, false is sync loading
   xmlhttp.send();

}

function singYrFunc(arr) {

   // reset data objects, so that plot refreshes correctly
   //date = [];
   pct10 = [];
   pct75 = [];
   pct90 = [];
   ci90 = [];
   mean = [];
   sd = [];


   for(var i = 0; i < arr[Object.keys(arr)[0]].length; i++) {

      // date.push(arr[i].acquisition_date);

      switch(measure) {
         case 'biomass':
           if(arr[Object.keys(arr)[0]][i].biomass_10pct_gpm > 1) {
             pct10.push( arr[Object.keys(arr)[0]][i].biomass_10pct_gpm * 8.92179122 );  // need to mult x 8.92179122 to convert gpm to lbs/acre
           } else { pct10.push('null'); }
           if(arr[Object.keys(arr)[0]][i].biomass_75pct_gpm > 1) {
             pct75.push( arr[Object.keys(arr)[0]][i].biomass_75pct_gpm * 8.92179122);
	   } else { pct75.push('null'); }
           if(arr[Object.keys(arr)[0]][i].biomass_90pct_gpm > 1) {
             pct90.push( arr[Object.keys(arr)[0]][i].biomass_90pct_gpm * 8.92179122);
	   } else { pct90.push('null'); }
           ci90.push( arr[Object.keys(arr)[0]][i].biomass_ci90_gpm * 8.92179122);
           if(arr[Object.keys(arr)[0]][i].biomass_mean_gpm > 1) {
             mean.push( arr[Object.keys(arr)[0]][i].biomass_mean_gpm * 8.92179122);
           } else { mean.push('null'); }
           sd.push( arr[Object.keys(arr)[0]][i].biomass_sd_gpm * 8.92179122);
           break;
         case 'ndvi':
           if(arr[Object.keys(arr)[0]][i].ndvi_10pct != -0.9999) {
             pct10.push(arr[Object.keys(arr)[0]][i].ndvi_10pct);
           } else { pct10.push('null'); }
           pct75.push(arr[Object.keys(arr)[0]][i].ndvi_75pct);
           pct90.push(arr[Object.keys(arr)[0]][i].ndvi_90pct);
           ci90.push(arr[Object.keys(arr)[0]][i].ndvi_ci90);
           mean.push(arr[Object.keys(arr)[0]][i].ndvi_mean);
           sd.push(arr[Object.keys(arr)[0]][i].ndvi_sd);
           break;
         case 'nbr':
           pct10.push(arr[Object.keys(arr)[0]][i].nbr_10pct);
           pct75.push(arr[Object.keys(arr)[0]][i].nbr_75pct);
           pct90.push(arr[Object.keys(arr)[0]][i].nbr_90pct);
           ci90.push(arr[Object.keys(arr)[0]][i].nbr_ci90);
           mean.push(arr[Object.keys(arr)[0]][i].nbr_mean);
           sd.push(arr[Object.keys(arr)[0]][i].nbr_sd);
           break;
         case 'nbr2':
           pct10.push(arr[Object.keys(arr)[0]][i].nbr2_10pct);
           pct75.push(arr[Object.keys(arr)[0]][i].nbr2_75pct);
           pct90.push(arr[Object.keys(arr)[0]][i].nbr2_90pct);
           ci90.push(arr[Object.keys(arr)[0]][i].nbr2_ci90);
           mean.push(arr[Object.keys(arr)[0]][i].nbr2_mean);
           sd.push(arr[Object.keys(arr)[0]][i].nbr2_sd);
           break;
      }

   }

   updateChart();
}


function updateChart() {

   var data = [
      {
        x: sy_months,
        //y: my_pr,
        y: my_climVar,
        type: 'bar',
        yaxis: 'y2',
        opacity: 0.6,
        name: 'Monthly ' + sy_label_short + ' Normals',
        text: '30yr Normal ' + sy_label_short,
        hoverinfo: 'text+y',
        marker: {
          //color: 'lightskyblue',
          color: climColorMy
        }
      },
      {
        x: sy_months,
        //y: sy_pr,
        y: sy_climVar,
        type: 'bar',
        yaxis: 'y2',
        opacity: 0.4,
        name: 'Monthly ' + sy_label_short + ' ' + yr,
        text: sy_label_short,
        hoverinfo: 'text+y',
        marker: {
          //color: 'cyan',
          color: climColorSy
        }
      },
      {
        x: sy_months,
        y: pct90_sp,
        type: 'scatter',
        mode: 'lines',
        name: '90 percentile',
        text: '90th percentile',
        hoverinfo: 'text+y',
        showlegend: false,
        line: {
          color: '#a9a9a9',
          width: 0,
          shape: 'linear',
          dash: 'dot'
        }
      },
      {
        x: sy_months,
        y: pct10_sp,
        type: 'scatter',
        mode: 'lines',
        fill: 'tonexty',
        fillcolor: 'rgba(200,200,200,0.4)',
        //fillcolor: '#F0F8FF',
        name: 'Normal 80th percentile',
        text: '80th percentile',
        hoverinfo: 'text+y',
        line: {
          color: '#a9a9a9',
          width: 0,
          shape: 'linear',
          dash: 'dot'
        }
      },
      {
        x: sy_months,
        y: mean_sp,
        name: 'Normal Mean ' + measure_caps,
        text: 'Normal Mean ' + measure_caps,
        hoverinfo: 'text+y',
        type: 'scatter',
        line: {
          color: 'black',
          width: 1,
          shape: 'linear'
        }
      }, 
      {
        x: sy_months,
        y: mean,
        type: 'scatter',
        line: {
          color: 'red',
          width: 2,
          shape: 'linear'
        },
        name: 'Monthly ' + measure_caps + " " + yr,
        text: 'Monthly ' + measure_caps,
        hoverinfo: 'text+y'
      } 
   ];

   var layout = {
       margin: {
          t: 80
       },
       legend: {
       //   x: 0.71,
       //   y: 0.96,
          x: 1.0,
	  xanchor: 'right',
          y: 1.02,
          bgcolor: 'rgba(255,255,255,0.5)'
       },
       title: {
          text: '' + measure_caps + '<br />' + usrRanch + ', Pasture: ' + pasture,
          font: {
            family: 'Arial',
            size: 18
          }
       },
       bargap: 0.4,
       xaxis: {
          title: {
            text: 'Year: ' + yr,
            font: {
              family: 'Arial',
              size: 16
            }
          },
          //range: [1.5, 10.5]
          range: [moStart, moEnd]
       },
       yaxis: {
          title: {
            text: '' + measure_caps + ' ' + units,
            font: {
              family: 'Arial', 
              size: 16
            }
          },
          hoverformat: '.0f',
	  rangemode: 'nonnegative'
          //range: ['' + yr + '-03-01', '' + yr + '-11-15']
       },
       yaxis2: {
          title: sy_label_long, 
          // titlefont: {color: '#2980B9'}, 
          // tickfont: {color: '#2980B9'}, 
          overlaying: 'y', 
          side: 'right',
          hoverformat: '.2f',
	  rangemode: 'nonnegative'
       } 
   };

   let modeBarButtons = [[ "toImage", "select2d", "lasso2d", "hoverClosestCartesian", "hoverCompareCartesian" ]];

   if ($('#chart .plot-container').length > 0){
      Plotly.deleteTraces('chart', 0);
      Plotly.purge('chart');
      Plotly.newPlot('chart', data, layout, {modeBarButtons: modeBarButtons, responsive: true} );
   } else {
      Plotly.newPlot('chart', data, layout, {modeBarButtons: modeBarButtons, responsive: true} );
   }

}
