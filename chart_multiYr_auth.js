// Define variables
// Set defaults

const baseUrl = 'https://rangesat.nkn.uidaho.edu/api/'; 
const geoj = 'geojson/';
const ps = 'pasturestats/'
const multYr = 'multi-year/';
const loc = 'Zumwalt/';
var ranch;
let usrRanch = $('#ddRanch').val();
let pasture = '';
let measure = 'biomass_mean_gpm';
let measureTxt = 'Biomass';
let varId = '';
let varVal = '';
let yr1 = '1984';
let yr2 = '2018';
let mm1 = '05';
let mm2 = '07';
let dd1 = '15';
let dd2 = '15';
let stat = 'mean';
let statCaps = 'Mean';
let xx = [];
let yy = [];
let av = [];
let newY = [];
let xxAbove = [];
let xxBelow = [];
let yyAbove = [];
let yyBelow = [];
let barcolorAbove = [];
let barcolorBelow = [];
var xmlhttp = new XMLHttpRequest();
let url ='';
let urlDL = '';

//------------------------------//
// Load landowner pasture names //
// Build pasture dropdown list  //
//------------------------------//

getPastures();   // on initial page load

function getPastures() {

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

}

//----------------------//
// Build Date Dropdowns //
//----------------------//

// Years, beginning 1984
//for (i = new Date().getFullYear(); i > 1983; i--) {
for (i = 2019; i > 1983; i--) {
   $('#ddMultYr1, #ddMultYr2').append($('<option />').val(i).html(i));
}
$("#ddMultYr1 option:last").attr('selected','selected');
$("#ddMultYr2 option:eq(1)").attr('selected','selected');

// Months
var mTxt = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var mNum = ["01","02","03","04","05","06","07","08","09","10","11","12"];
var m_opt = '';
for (var i = 0; i < mTxt.length; i++){
   m_opt += '<option value="'+ mNum[i] + '">' + mTxt[i] + '</option>';
}
$('#ddMonth1, #ddMonth2').append(m_opt);
$("#ddMonth1 option:eq(4)").attr('selected','selected');
$("#ddMonth2 option:eq(6)").attr('selected','selected');

// Days
for (var i = 1; i < 32; ++i) {
   if(i < 10){ i = "0" + i; };
   $('#ddDay1, #ddDay2').append($('<option />').val(i).html(i));
}
$("#ddDay1 option:eq(14)").attr('selected','selected');
$("#ddDay2 option:eq(14)").attr('selected','selected');


//-----------------------------//
// Process on-change events    //
// ----------------------------//

$('#q1').click(function(){
   $('#indicator-help').toggle(500);
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
      case "ddRanch":
         usrRanch = varVal;
         $('#ddPasture').empty();    // clear Pastures dropdown
         getPastures();              // rebuild Pastures dropdown
         break;
      case "ddPasture":
         pasture = varVal;
         break;
      case "ddMultYr1":
         yr1 = varVal;
         break;
      case "ddMultYr2":
         yr2 = varVal;
         break;
      case "ddMonth1":
         mm1 = varVal;
         break;
      case "ddMonth2":
         mm2 = varVal;
         break;
      case "ddDay1":
         dd1 = varVal;
         break;
      case "ddDay2":
         dd2 = varVal;
         break;
      case "ddStatistic":
         stat = varVal;
         statCaps = $('#ddStatistic option:selected').text();
         break;
      case "ddMeasure":
         measure = varVal;
         measureTxt = $('#ddMeasure option:selected').text();
         break;
      default: 
         //console.log("NOTHING TO DO HERE");
   }
});


$('#ddRanch, #ddPasture, #ddMultYr1, #ddMultYr2, #ddMonth1, #ddMonth2, #ddDay1, #ddDay2, #ddMeasure, #ddStatistic').change(function() {
   updateChart();
});


//---------------------//
// Create/Update Chart //
//---------------------//

updateChart();  // on initial page load

function updateChart() {

   // Construct api endpoint URL
   url = baseUrl + ps + multYr + loc + "?ranch=" + usrRanch + "&pasture=" + escape(pasture) + "&start_year=" + yr1 + "&end_year=" + yr2 + "&start_date=" + mm1 + "-" + dd1 + "&end_date=" + mm2 + "-" + dd2 + "&agg_func=" + stat;
   urlDL = url + '&csv=True';

   $('#csv').attr('href',urlDL);


   xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          var multYrArr = JSON.parse(this.responseText);  
          multYrFunc(multYrArr);
      }
   };
   xmlhttp.open("GET", url, false); // true is async, false is sync loading
   xmlhttp.send();

}  


function multYrFunc(arr) {

   //console.log(arr.length);

   // reset data objects, so that plot refreshes correctly
   xx = [];
   yy = [];
   av = [];
   newY = [];
   xxAbove = [];
   xxBelow = [];
   yyAbove = [];
   yyBelow = [];
   barcolorAbove = [];
   barcolorBelow = [];

   var total = 0;

   for(var i = 0; i < arr.length; i++) {
      xx.push(arr[i].year);

      switch(measure) {
        case "biomass_mean_gpm":
          arr[i].biomass_mean_gpm = arr[i].biomass_mean_gpm * 8.92179122; // convert gpm to lbs/acre
          yy.push(arr[i].biomass_mean_gpm);
          total += arr[i].biomass_mean_gpm;
          break;
        case "ndvi_mean":
          yy.push(arr[i].ndvi_mean);
          total += arr[i].ndvi_mean;
          break;
        case "nbr_mean":
          yy.push(arr[i].nbr_mean);
          total += arr[i].nbr_mean;
          break;
        case "nbr2_mean":
          yy.push(arr[i].nbr2_mean);
          total += arr[i].nbr2_mean;
          break;
        default:
          //console.log("NOTHING TO DO HERE");
      }

   }

   var avg = total/arr.length;
   for(var i = 0; i < arr.length; i++) {
      av.push(avg);
   }

   for(var i = 0; i < yy.length; i++) {
      if(yy[i] != 0) {
        newY.push(yy[i] - av[i]);
      } else {
        newY.push(yy[i]);
      }
      //console.log(newY[i]);
   }

   for(var i = 0; i < newY.length; i++) {
      if(newY[i] > 0) { 
        yyAbove.push(newY[i]);
        xxAbove.push(xx[i]);
        barcolorAbove.push('#5c9cd2'); // blue
      } else {
        yyBelow.push(newY[i]);
        xxBelow.push(xx[i]);
        barcolorBelow.push('#cd705b');  // rust
      }
   }

   var data = [
      {
        x: xxAbove,
        y: yyAbove,
        base: avg,
        type: 'bar',
        name: 'Above Average ' + measureTxt,
        marker: {
          color: barcolorAbove
        }
      },
      {
        x: xxBelow,
        y: yyBelow,
        base: avg,
        type: 'bar',
        name: 'Below Average ' + measureTxt,
        marker: {
          color: barcolorBelow
        }
      },
      {
        x: xx,
        y: av,
        type: 'line',
        name: 'Average',
        mode: 'lines',
      }
   ];

   // get y-axis min and max
   var ymin = Math.min.apply(null,yy.filter(Boolean));
   var ymax = Math.max.apply(null,yy);
   ymin = ymin - (ymax - ymin) * 0.1;
   ymax = ymax + (ymax - ymin) * 0.1;
   //ymin = Math.round(ymin);
   //ymax = Math.round(ymax);
   //console.log('MIN/MAX: ' + ymin + ', ' + ymax);

   var layout = { 
      margin: { 
          t: 80
      }, 
      legend: {
        x: 0.8,
        y: 1.0,
        bgcolor: 'rgba(255,255,255,0.5)'
      },
      title: { 
        text: '' + statCaps + ' ' + measureTxt + ' over season: ' + mm1 + '-' + dd1 + ' to ' + mm2 + '-' + dd2 + '<br />Landowner: ' + usrRanch + ', Pasture: ' + pasture, 
        font: { 
         // family: 'Arial', 
          size: 18 
        } 
      },
      xaxis: { 
        title: { 
          text: 'Year', 
          font: { 
            //family: 'Arial', 
            size: 14 
          } 
        } 
      },
      yaxis: { 
        title: { 
          //text: 'Vegetation Biomass (lbs/acre)', 
          text: '' + measureTxt + ' ' + statCaps, 
          font: { 
            //family: 'Arial', 
            size: 14 
          } 
        },
        range: [ymin, ymax] 
      }
   };

   if ($('#chart .plot-container').length > 0){
      Plotly.deleteTraces('chart', 0);
      Plotly.purge('chart');
      Plotly.newPlot('chart', data, layout);
   } else {
      Plotly.newPlot('chart', data, layout);
   }

}
