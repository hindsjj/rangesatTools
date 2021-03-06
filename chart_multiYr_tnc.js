// Define variables
// Set defaults
// Ex:  https://rangesat.org/api/ranchstats/multi-year/Zumwalt/?ranch=TNC&start_year=1984&end_year=2019&start_date=05-15&end_date=07-15&agg_func=mean
// https://rangesat.org/api/pasturestats/multi-year/Zumwalt/?ranch=TNC&pasture=A1&start_year=1984&end_year=2019&start_date=05-15&end_date=07-15&agg_func=mean
const baseUrl = 'https://rangesat.org/api/'; 
const geoj = 'geojson/';
const ps = 'pasturestats/'
const rs = 'ranchstats/'
const multYr = 'multi-year/';
const interYr = 'inter-year/';
const loc = 'Zumwalt/';
var ranch;
let usrRanch ='TNC';
let pasture = '';
let measure = 'biomass_mean_gpm';
let measureTxt = 'Biomass';
let varId = '';
let varVal = '';
let yr1 = '1984';
let yr2 = '2019';
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
let urlDL ='';
let urlDL2 ='';
let lr = [];

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
 
   // Prepend dropdown help text and "ALL" (ranchwide) option
   $("#ddPasture").prepend("<option value='ALL'>ALL PASTURES</option>").val('');
   $("#ddPasture").prepend("<option value='' disabled='disabled'>- Select a pasture - </option>").val('');

   // Set default pasture selection
   pasture = $('#ddPasture option:eq(2)').val();
   $("#ddPasture option:eq(2)").attr('selected','selected');

});


//----------------------//
// Build Date Dropdowns //
//----------------------//

// Years, beginning 1984
//for (i = new Date().getFullYear(); i > 1983; i--) {
for (i = 2020; i > 1983; i--) {
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
      case "ddPasture":
        pasture = varVal;
        break;
      case "ddMultYr1":
        yr1 = varVal;
        break;
      case "ddMultYr2":
        yr2 = varVal;
        console.log('YR2: ' + yr2);
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


$('#ddPasture, #ddMultYr1, #ddMultYr2, #ddMonth1, #ddMonth2, #ddDay1, #ddDay2, #ddMeasure, #ddStatistic').change(function() {
   updateChart();
});


//---------------------//
// Create/Update Chart //
//---------------------//

updateChart();  // on initial page load

function updateChart() {

   // Construct api endpoint URL
   if(pasture === 'ALL') {
      url = baseUrl + rs + multYr + loc + "?ranch=" + usrRanch + "&start_year=" + yr1 + "&end_year=" + yr2 + "&start_date=" + mm1 + "-" + dd1 + "&end_date=" + mm2 + "-" + dd2 + "&agg_func=" + stat;
   } else {
      url = baseUrl + ps + multYr + loc + "?ranch=" + usrRanch + "&pasture=" + escape(pasture) + "&start_year=" + yr1 + "&end_year=" + yr2 + "&start_date=" + mm1 + "-" + dd1 + "&end_date=" + mm2 + "-" + dd2 + "&agg_func=" + stat;
   }
   urlDL = url + '&units=en&drop=ndvi_mean;ndvi_sd;ndvi_10pct;ndvi_75pct;ndvi_90pct;ndvi_ci90;nbr_sd;nbr_mean;nbr_10pct;nbr_75pct;nbr_90pct;nbr_ci90;nbr2_mean;nbr2_sd;nbr2_10pct;nbr2_75pct;nbr2_90pct;nbr2_ci90;summer_vi_mean_gpm;fall_vi_mean_gpm&csv=True';
   urlDL2 = baseUrl + ps + interYr + loc + "?ranch=" + usrRanch + "&start_year=" + yr1 + "&end_year=" + yr2 + "&start_date=" + mm1 + "-" + dd1 + "&end_date=" + mm2 + "-" + dd2 + "&units=en&drop=ndvi_mean;ndvi_sd;ndvi_10pct;ndvi_75pct;ndvi_90pct;ndvi_ci90;nbr_sd;nbr_mean;nbr_10pct;nbr_75pct;nbr_90pct;nbr_ci90;nbr2_mean;nbr2_sd;nbr2_10pct;nbr2_75pct;nbr2_90pct;nbr2_ci90;summer_vi_mean_gpm;fall_vi_mean_gpm&csv=True";

   $('#csv1').attr('href',urlDL);  // single pasture by year
   $('#csv2').attr('href',urlDL2); // all pastures across selected years


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
   var subtract = 0;
   var avg = 0;

   for(var i = 0; i < arr.length; i++) {
      xx.push(arr[i].year);

      switch(measure) {
        case "biomass_mean_gpm":
          if (arr[i].biomass_mean_gpm == null) {
            arr[i].biomass_mean_gpm = null;
            subtract = subtract + 1;
                  console.log("arrBiomass: " + arr[i].biomass_mean_gpm + ", subtract: " + subtract);
          } else {
            arr[i].biomass_mean_gpm = arr[i].biomass_mean_gpm * 8.92179122; // convert gpm to lbs/acre
          }
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

   /* Prepare x, y pairs for linear regression (trendline) */
   lr = [];
   for(var i = 0; i < yy.length; i++) {
      lr.push([xx[i], yy[i]]);
   }

   let result = regression.linear(lr);
   let gradient = result.equation[0];
   let yIntercept = result.equation[1];

   y0 = (gradient * yr1) + yIntercept;
   y1 = (gradient * yr2) + yIntercept;
   /* end trendline */



   if (measure == 'biomass_mean_gpm') {
       avg = total/(arr.length - subtract);
           console.log(measure);
   } else {
       avg = total/arr.length;
   }

   for(var i = 0; i < arr.length; i++) {
       av.push(avg);
   }

   for(var i = 0; i < yy.length; i++) {
      if(yy[i] != 0 && yy[i] != null) {
         newY.push(yy[i] - av[i]);
      } else {
        newY.push(yy[i]);
      }
      //console.log(newY[i]);
   }

   for(var i = 0; i < newY.length; i++) {
      if(newY[i] === null) {
         // do nothing  
      } else if (newY[i] > 0) { 
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
      },
      {
        x: [yr1, yr2],
        y: [y0, y1],
        type: 'line',
        name: 'Trendline',
        mode: 'lines',
	line: {
             color: '#000000',
             width: 2,
             dash: 'dot'
        }
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
        x: 1.0,
	xanchor: 'right',
        y: 1.01,
        bgcolor: 'rgba(255,255,255,0.5)',
        orientation: 'h'
      },
      title: { 
        text: '' + statCaps + ' ' + measureTxt + ' over season: ' + mm1 + '-' + dd1 + ' to ' + mm2 + '-' + dd2 + '<br />' + usrRanch + ', Pasture: ' + pasture, 
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

   let modeBarButtons = [[ "toImage", "select2d", "lasso2d", "hoverClosestCartesian", "hoverCompareCartesian" ]];

   if ($('#chart .plot-container').length > 0){
      Plotly.deleteTraces('chart', 0);
      Plotly.purge('chart');
      Plotly.newPlot('chart', data, layout, {modeBarButtons: modeBarButtons, responsive: true} );
   } else {
      Plotly.newPlot('chart', data, layout, {modeBarButtons: modeBarButtons, responsive: true} );
   }

}
