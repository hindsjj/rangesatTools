/* SET DEFAULTS */
let indicator = 'biomass';
let opac = 0.2;
let varId = '';
let varVal = '';
let dayEnd = 31;
let yr = 2019;
//let mm = 5;
let mm1 = 5;
let mm2 = 5;
let mo1 = 'May';
let mo2 = '';
let pasture = [];
let biomass_mean = [];
var xmlhttp = new XMLHttpRequest();
let layerName = '';
let usersRanch = [];
let tbl = '';

//----------------------//
// Build Date Dropdowns //
//----------------------//

// Years, beginning 1982
//for (var i = new Date().getFullYear(); i > 1981; i--) {
for (var i = 2019; i > 1981; i--) {
  $('#ddYear').append($('<option />').val(i).html(i));
}
$("#ddYear option:eq(0)").attr('selected','selected');

// Months
var mTxt = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var mNum = ["1","2","3","4","5","6","7","8","9","10","11","12"];
var m_opt = '';
for (var i = 0; i < mTxt.length; i++){
  m_opt += '<option value="'+ mNum[i] + '">' + mTxt[i] + '</option>';
}
$('#ddMonth').append(m_opt);
$("#ddMonth option:eq(4)").attr('selected','selected');


//-----------------------------//
// Process on-change events    //
// ----------------------------//

$('#ddYear').change(function() {
   yr = $(this).val();

   // set number of days in February, accounting for leap years
   if ((yr % 4 === 0 && yr % 100 !== 0) || (yr % 100 === 0 && yr % 400 === 0)) {  // it is a leap year

        if($('#apr-oct').is(':checked')) {

 	  // do nothing, since Feb is not relevant

 	} else {  // leap year is true AND seasonal option is NOT checked

          if (mm1 == 2) { dayEnd = 29; }

	}

   } else {    // it is not a leap year

        if($('#apr-oct').is(':checked')) {

          // do nothing, since Feb is not relevant
         
        } else {  // leap year is false and seasonal option is NOT checked

           if (mm1 == 2) { dayEnd = 28; }

	}

   }
  getPastureStats();
});

$('#ddMonth').change(function() {
  mm1 = mm2 = $(this).val();  // start month and end month are same
  switch (mm1) {
    case '1': dayEnd = 31; mo1 = 'Jan'; break;  // month is January, so 31 days
    case '2': mo1 = 'Feb';  // leap year handling for February
      if ((yr % 4 === 0 && yr % 100 !== 0) || (yr % 100 === 0 && yr % 400 === 0)) {
        dayEnd = 29; 
      } else { 
        dayEnd = 28; 
      }
      break;
    case '3': dayEnd = 31; mo1 = 'Mar'; break;
    case '4': dayEnd = 30; mo1 = 'Apr'; break;
    case '5': dayEnd = 31; mo1 = 'May'; break;
    case '6': dayEnd = 30; mo1 = 'Jun'; break;
    case '7': dayEnd = 31; mo1 = 'Jul'; break;
    case '8': dayEnd = 31; mo1 = 'Aug'; break;
    case '9': dayEnd = 30; mo1 = 'Sep'; break;
    case '10': dayEnd = 31; mo1 = 'Oct'; break;
    case '11': dayEnd = 30; mo1 = 'Nov'; break;
    case '12': dayEnd = 31; mo1 = 'Dec'; break;
  }
  getPastureStats();
});

$('select').change(function() {   // for any change to a select field
  varId = $(this).attr('id');
  varVal = $(this).val();
  console.log('ID: ' + varId + ', Value: ' + varVal);
  $('#' + varId + ' option').each(function(){
       if ($(this).val() == varVal) {
           $(this).attr('selected','selected');
       } else {
           $(this).removeAttr('selected');
       }
  });
  info.update();
});

// seasonal option, replaces month with April-Oct average
$('#apr-oct').click(function() {
  if($('#apr-oct').is(':checked')) {
    //$("#ddMonth option:eq(5)").attr('selected','selected');
    $('#ddMonth').css('visibility', 'hidden');   // disable month dropdown if showing seasonal
    mm1 = 4; mm2 = 10; dayEnd = 31; mo1 = 'Apr'; mo2 = '-Oct';  // set start month to April, end month to Oct
    //console.log("6: " + mm1 + ", " + mm2);
    info.update();
    getPastureStats();
  } else {
    $('#ddMonth').css('visibility', 'visible');
    mm1 = mm2 = 6; dayEnd = 30; mo1 = 'Jun'; mo2 = '';
    getPastureStats();
    info.update();
    $("#ddMonth option:eq(5)").attr('selected','selected');
    //console.log("7: " + mm1 + ", " + mm2);
  }
});

// Adjust opacity - doesn't work
/*
$('#opacitySlider').change(function() {
   opac = $(this).val();
   opac = opac/100;
   usersRanch.setOpacity(opac);
}); */


//-------------------------------//
// Load geojson ranch boundaries //
//-------------------------------//

let ranch;
usrRanch = 'RCR';

function loadJSONFile(callback) {   

    var xmlobj = new XMLHttpRequest();
    xmlobj.overrideMimeType("application/json");
    xmlobj.open('GET', 'https://rangesat.nkn.uidaho.edu/api/geojson/SageSteppe/' + usrRanch, false); // Change true to false for synchronous loading.
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


//------------//
// CREATE MAP //
//------------//

// Basemaps
var googSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{ maxZoom: 16, subdomains:['mt0','mt1','mt2','mt3'] });
var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});

var map = L.map('map', {
   center: [43.37, -114.4],
   zoom: 10,
   layers: [googSat, OpenTopoMap]
});

var baseLayers = {
   "Topo": OpenTopoMap,
   "Satellite": googSat
};

// Add layer toggle controller
L.control.layers(baseLayers).addTo(map);


// Disable scroll wheel zoom
map.scrollWheelZoom.disable();


// Map Title Box
  var info = L.control( { position: 'bottomleft' });

  info.onAdd = function (map) {
     this._div = L.DomUtil.create('div', 'info');
     this.update();
     return this._div;
  };

  info.update = function () {
     this._div.innerHTML = '<div style="background:#fff;opacity:0.7;border-radius:6px;padding:4px 6px"><h4>Rock Creek Ranch</h4><span style="font-size:14px"><strong>' + yr + ' ' + mo1 + mo2 + '</strong> &mdash; Average Biomass (lbs/acre)</span></div>';
  };

  info.addTo(map);

// Map Legend
  var legend = L.control({position: 'bottomright'});

  legend.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
                grades = ['>2000', '1750-2000', '1500-1750', '1250-1500', '1000-1250', '750-1000', '500-750', '<500'],
                avgColors = ['dodgerblue','cyan','lime','greenyellow','yellow','orange','coral','red'],
                labels = [];

        for (var i = 0; i < grades.length; i++) {
                labels.push( '&nbsp;<span style="opacity:0.8;background-color:' + avgColors[i] + '">&nbsp;&nbsp;&nbsp;&nbsp;</span> ' + grades[i] );
        }

        div.innerHTML = '<div style="background:#fff;opacity:0.8;border-radius:6px;padding:4px 6px">Biomass (lbs/ac)<br>' + labels.join('<br>') + '</div>';
        return div;
  };

  legend.addTo(map);


// Run function on initial page load
getPastureStats();

function getPastureStats() {

  url = 'https://rangesat.nkn.uidaho.edu/api/pasturestats/intra-year/SageSteppe/?year=' + yr + '&start_date=' + mm1 + '-1&end_date=' + mm2 + '-' + dayEnd + '&ranch=RCR';
  //console.log('TEST: ' + url);

  xmlhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
          var array = JSON.parse(this.responseText);
          updateMap(array);
      }
  };
  xmlhttp.open("GET", url, false); // true is async, false is sync loading
  xmlhttp.send();

}

function updateMap(arr) {

  tbl = '';
  tbl = '<table class="table-sm" style="max-width:700px"><thead><tr><th>Date</th><th>Mgmt Area</th><th>Pasture</th><th>Acres</th><th>Biomass (lbs/acre)</th></tr></thead><tbody>';

  if(usersRanch) { map.removeLayer(usersRanch); }  // if usersRanch layer exists, remove it before updating

  usersRanch = L.geoJson(ranch, {
    style: {
      color: '#f0f0f0',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.4
    }, 

    onEachFeature: function(feature, layer) {

      for(var i = 0; i < arr.length; i++) {
        if (arr[i].pasture == feature.properties.Pasture) {
          arr[i].biomass_mean_gpm = arr[i].biomass_mean_gpm * 8.92179122; // convert gpm to lbs/acre
          var pastureBiomass = arr[i].biomass_mean_gpm;
	  pastureBiomass = pastureBiomass.toFixed(0);
          if(pastureBiomass < 500) { varColor = 'red'; }
          if(pastureBiomass >= 500 && pastureBiomass < 750) { varColor = 'coral'; }
          if(pastureBiomass >= 750 && pastureBiomass < 1000) { varColor = 'orange'; }
          if(pastureBiomass >= 1000 && pastureBiomass < 1250) { varColor = 'yellow'; }
          if(pastureBiomass >= 1250 && pastureBiomass < 1500) { varColor = 'greenyellow'; }
          if(pastureBiomass >= 1500 && pastureBiomass < 1750) { varColor = 'lime'; }
          if(pastureBiomass >= 1750 && pastureBiomass < 2000) { varColor = 'cyan'; }
          if(pastureBiomass >= 2000) { varColor = 'dodgerblue'; }

	  layer.setStyle({ color: varColor });

	  tbl = tbl + '<tr><td>' + yr + '-' + mo1 + mo2 + '</td><td>RCR</td><td>' + arr[i].pasture + '</td><td>' + (feature.properties.GIS_acres * 2.471).toFixed(2) + '</td><td>' + (arr[i].biomass_mean_gpm).toFixed(0) + '</td></tr>'; 
	}
      }

      var acres = feature.properties.GIS_acres.toFixed(2);
      layerName = feature.properties.Pasture;

      layer.bindPopup('<table class="popUpTbl"><tr class="border-bot"><td><strong>BIOMASS: </strong></td><td>' + pastureBiomass + ' lbs/acre</td></tr><tr><td><strong>Owner: </strong></td><td>' + feature.properties.Ownership + '</td></tr><tr><td><strong>Pasture: </strong></td><td>' + feature.properties.Pasture + '</td></tr><tr><td><strong>Acres: </strong></td><td>' + acres + '</td></tr></table>');

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

    }
  }).addTo(map);   
 
  tbl = tbl + '</tbody></table>';
  $('.tblPastureAvg').html(tbl);

  // Add/update PRINT button
  $('.leaflet-control-easyPrint').remove();  // removes any existing print btns
  var printer = L.easyPrint({
     title: 'Download PNG image',
     position: 'topleft',
     //sizeModes: ['Current', 'A4Portrait', 'A4Landscape'],
     sizeModes: ['Current'],
     filename: 'pastureAvg_' + yr + '_' + mo1 + mo2 + '_RCR',
     exportOnly: true,
     hideControlContainer: false
  }).addTo(map);

  // delete print button for safari
  if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
        console.log('Browser is Safari');
        $('.leaflet-control-easyPrint').remove();  // removes any existing print btns
  }

  map.fitBounds(usersRanch.getBounds());  // zooms to RCR management area

}
