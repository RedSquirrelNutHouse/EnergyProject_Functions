const admin = require('firebase-admin');
admin.initializeApp();
var db = admin.firestore();
db.settings( { timestampsInSnapshots: true });

/**
* Generates the Reports for the selected Sitename and AM and PM
*
*/
function getReportData(customerSiteName,AM,PM)
{
  var deviceData = [];
  var deviceSettings = [];
  var allSettings = [];
  var addressOfSiteData ;
  var getLogo = null;
  var logo = "";
  // First we need to get all the devices for the site
  db.collection("devices").where("siteName","==",customerSiteName).where("deviceStatus.deviceType","==","MEMS4.2").get()
  .then((devices)=>{
    devices.forEach((device,index)=>{
      console.log(device.data());
      deviceData.push(device.data());
    });
    console.log("devices Gotten");
    //console.log(deviceData);
    deviceData.forEach((deviceData)=>{
      var Devicesettings = db.collection("devices").doc(deviceData.deviceId).collection("deviceSettings").doc("Settings").get()
      .then((settings)=>{
        deviceSettings.push(settings.data());
        console.log("Settings Gotten");
      })
      .catch((error)=>{console.log(error);});
      allSettings.push(Devicesettings);
    });
    // Get the Site Address
    var siteAddress = db.collection("customerSites").doc(customerSiteName).get()
    .then((address)=>{
      addressOfSiteData = address.data();
      //console.log(addressOfSiteData);
    })
    .catch((error)=>{console.log(error);});
    allSettings.push(siteAddress);



    Promise.all(allSettings).then(function(values) {
      // get Report Data
      var unitData = [];
      // Works out the offset
      var dateOffset = 3600000; // Offset in microseconds for 1 hour
      // Get the check Time - 
      var amStartTime = new Date();
      amStartTime.setHours(AM);
      amStartTime.setTime(amStartTime.getTime() - dateOffset);
      var amEndTime = new Date();
      amEndTime.setHours(AM);
      amEndTime.setTime(amEndTime.getTime() + dateOffset);
      var pmStartTime = new Date();
      pmStartTime.setHours(PM);
      pmStartTime.setTime(pmStartTime.getTime() - dateOffset);
      var pmEndTime = new Date();
      pmEndTime.setHours(PM);
      pmEndTime.setTime(pmEndTime.getTime() + dateOffset);
      // For each of the settings for the device we need to do calculations
      deviceSettings.forEach((setting, index)=>
      {
        var deviceValues = deviceData[index].averageForDayData.sensorValues;
        var sensorOneTotalAM = 0;
        var sensorTwoTotalAM = 0;
        var sensorThreeTotalAM = 0;
        var sensorOneTotalPM = 0;
        var sensorTwoTotalPM = 0;
        var sensorThreeTotalPM = 0;
        var countAm = 0;
        var countPm = 0;
        
        // We format the report now we have the info.
        getLogo = db.collection("customers").doc(addressOfSiteData.CustomerName).get()
        .then((customerInfo)=>{
          // get the Photo URL.
          logo = customerInfo.data().logoURL;
         
        })
        .catch((error)=>{console.log(error);});

        deviceValues.forEach((sensor)=>{
          // console.log("sensor time" + sensor.time.toDate());
          // console.log(amStartTime);

          // Check if AM ot PM and calculate the values.
                   if (sensor.time.toDate() >= amStartTime && sensor.time.toDate() <= amEndTime)
          {
            console.log(sensor.time.toDate() );
            if (sensor.relayOneSensor < sensorOneTotalAM )
            {
              sensorOneTotalAM = sensor.relayOneSensor;
            }
            if (sensor.relayTwoSensor < sensorTwoTotalAM )
            {
              sensorTwoTotalAM = sensor.relayTwoSensor;
            }
            if ( sensor.relayThreeSensor < sensorThreeTotalAM )
            {
              sensorThreeTotalAM = sensor.relayThreeSensor;
            }
            //sensorOneTotalAM += sensor.relayOneSensor;
            // sensorTwoTotalAM += sensor.relayTwoSensor;
            // sensorThreeTotalAM += sensor.relayThreeSensor;
            // countAm++;

          }
          if (sensor.time.toDate() >= pmStartTime && sensor.time.toDate() <= pmEndTime)
          {
            if (sensor.relayOneSensor < sensorOneTotalPM )
            {
              sensorOneTotalPM = sensor.relayOneSensor;
            }
            if (sensor.relayTwoSensor < sensorTwoTotalPM )
            {
              sensorTwoTotalPM = sensor.relayTwoSensor;
            }
            if (sensor.relayThreeSensor < sensorThreeTotalPM )
            {
              sensorThreeTotalPM = sensor.relayThreeSensor;
            }
            // sensorOneTotalPM += sensor.relayOneSensor;
            // sensorTwoTotalPM += sensor.relayTwoSensor;
            // sensorThreeTotalPM += sensor.relayThreeSensor;
            // countPm++;
          }
        });
    
        if (setting.relayOneSensorId != "NULL" && setting.relayOneFreezerName != "" )
        {
          
          // The Unit value
          var unit = {
          FreezerName: 'Minerals',
          TargetTemp: '0 to 5',
          am: 0.15,
          pm: 3.6,
          inRange: true,
          comment: ''
          };
          unit.FreezerName = setting.relayOneFreezerName;
          unit.TargetTemp = setting.Relay1RangeHigh + " to " + setting.Relay1RangeLow;
          // unit.am = (sensorOneTotalAM/countAm).toFixed(2);
          // unit.pm = (sensorOneTotalPM/countPm).toFixed(2);
          unit.am = sensorOneTotalAM.toFixed(2);
          unit.pm = sensorOneTotalPM.toFixed(2);
          unit.inRange = (unit.am <= setting.Relay1RangeLow);
          unitData.push(unit);

        }
        if (setting.relayTwoSensorId != "NULL" && setting.relayTwoFreezerName != "" )
        {
            // The Unit value
            var unit = {
              FreezerName: "",
              TargetTemp: "",
              am: 0,
              pm: 0,
              inRange : "true",
              comment : "",
              Error : ""
            };
            unit.FreezerName = setting.relayTwoFreezerName;
            unit.TargetTemp = setting.Relay2RangeHigh + " to " + setting.Relay2RangeLow;
            // unit.am = (sensorTwoTotalAM/countPm).toFixed(2);
            // unit.pm = (sensorTwoTotalPM/countPm).toFixed(2);
            unit.am = sensorTwoTotalAM.toFixed(2);
            unit.pm = sensorTwoTotalPM.toFixed(2);
            unit.inRange = (unit.am <= setting.Relay2RangeLow);
            unitData.push(unit);
        }
        if (setting.relayThreeSensorId != "NULL" && setting.relayThressFreezerName != "" )
        {
            // The Unit value
            var unit = {
              FreezerName: "",
              TargetTemp: "",
              am: 0,
              pm: 0,
              inRange : "true",
              comment : "",
              Error : ""
            };
            unit.FreezerName = setting.relayThreeFreezerName;
            unit.TargetTemp = setting.Relay3RangeHigh + " to " + setting.Relay3RangeLow;
            // unit.am = (sensorThreeTotalAM/countAm).toFixed(2);
            // unit.pm = (sensorThreeTotalPM/countPm).toFixed(2);
            unit.am = sensorThreeTotalAM.toFixed(2);
            unit.pm = sensorThreeTotalPM.toFixed(2);
            unit.inRange = (unit.am <= setting.Relay3RangeLow);
            unitData.push(unit);
        }

      });
      var reportName = "HACCP " + amStartTime.getDate() + "-" + (amStartTime.getMonth() + 1) + "-" + amStartTime.getFullYear() + " " + customerSiteName;
      Promise.all([getLogo]).then(()=>{
        console.log("Logo = " + logo);
        var reportData = {
          unitData : unitData,
          Address : addressOfSiteData,
          Site: customerSiteName,
          signedOffBy: "",
          signeedOff: false,
          reportName: reportName,
          date: amStartTime,
          logo: logo,
          pdf: ""
        }
        console.log(reportData);
        // Generate the Report Name
        //var reportName = "HACCP " + amStartTime.getDate() + "-" + amStartTime.getMonth() + "-" + amStartTime.getFullYear() + " " + customerSiteName;
       
        db.collection("reports").doc(customerSiteName).collection("reports").doc(reportName).set(reportData)
        .then(()=>{
          console.log("Created New Report.")
          // Print the values create the report.
          console.log(unitData);
        })
        .catch((error)=>{});
      })
      
      
      

    });
    
  }).catch((error)=>{console.log(error);});

}

exports.HACCP = (req, res) => {
   // First we get all the sites for HACCP
   var promises = [];
   // First we get all the sites for HACCP
   db.collection("customerSites").get()
   .then((docs) => {
     docs.forEach((site)=>{
       console.log(site.id);
       var done = getReportData(site.id,7,19);
       promises.push(done);
    
    });
    Promise.all(promises).then(function(values) {
      console.log(values);
      res.status(200).send("Done With reports");
    });
   });
  
};
