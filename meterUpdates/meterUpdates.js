const admin = require('firebase-admin');
admin.initializeApp();
var db = admin.firestore();
db.settings( { timestampsInSnapshots: true });


/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.meterUpdates = (event, context) => {

  console.log("Version 1.0 going to cloud");
  // Step one get the pub sub state info.
  const pubsubMessage = event.data;
  let data = event.data;
  let buff = new Buffer(data, 'base64');
  let jsonText = buff.toString('ascii');
  console.log("NEW DATA RECIVED !");
  var telemetryData = JSON.parse(jsonText);
  const deviceId = telemetryData.deviceid;
  let currentTime = admin.firestore.Timestamp.now();
  console.log(jsonText);
  // First we need to test that the type is data if not then status
  
  if (telemetryData.messageType ==  "status")
  {
    console.log("Status Recived for " + deviceId );
      // Add the new document to the MEMS Device sub collection.
    deviceDoc = db.collection('devices').doc(deviceId).get()
    .then(ref => {
     
      if (!ref.exists)
      {
        console.log("Doc Missing");
        // Create Default data Set
        let data = {
          deviceName: '',
          CustomerName: '',
          siteName: '',
          deviceLocation: '',
          deviceId: deviceId,
          deviceComment: '',
          averageForDayData: {
            deviceData: {
              currentDailyUsage: 0    
            },
            sensorValues: []
          },
          deviceStatus: { 
            deviceLastOnline: admin.firestore.FieldValue.serverTimestamp(),
            deviceStatus: true,
            firmwareVersion : telemetryData.firmwareVersion,
            settingsVersion: telemetryData.settingsVersion,
            deviceType: telemetryData.deviceType
          } 
        };
        return db.collection('devices').doc(deviceId).set(data).then(()=> {})
        .catch((error) => {console.log(error)});
      }
      else
      {
        console.log("Doc Exists");
        // Lust update the status
        let updateData =  { deviceStatus: { 
            deviceLastOnline: admin.firestore.FieldValue.serverTimestamp(),
            deviceStatus: true,
            firmwareVersion : telemetryData.firmwareVersion,
            settingsVersion: telemetryData.settingsVersion,
            deviceType: telemetryData.deviceType
          } };
        return db.collection('devices').doc(deviceId).update(updateData).then(()=> {})
        .catch((error) => {console.log(error)});
      }
    
    })
    .catch((error) => {console.log(error)});
  }
  else
  {
    console.log("Data Recived");
    // Get the doc data to get averageForDayData
  	db.collection('devices').doc(deviceId).get()
    .then((doc)=> {
      // Get the sensor Valuse
      let sensorValues = doc.data().averageForDayData.sensorValues;
      // Get to update the array 
      let averageForDayData = [];
      averageForDayData = doc.data().averageForDayData;
      console.log(averageForDayData);
      // One day = 86400000 ms so all below a day we keep !
      let filteredSensorValues =  [];
      // Apply Filter.
      if (sensorValues.length > 0)
      {
         console.log("Filtering data");
     	 filteredSensorValues = sensorValues.filter(value => (currentTime.toMillis() - value.timestamp.toMillis() < 86400000));
      }
      else
      {
        console.log("Not Filtered");
      }
      // Crate data
      let newData = { 
                       timestamp : currentTime,
                       kwh : telemetryData.energy
                    };
      // Push Data to filtered
      filteredSensorValues.push(newData);
      // Update averageForDayData
      averageForDayData.sensorValues = filteredSensorValues;
      // Update NoSql ...
      let dataToReplace = { averageForDayData : averageForDayData };
      return db.collection('devices').doc(deviceId).update(dataToReplace).then(()=> {})
      .catch((error) => {console.log(error)});
    })
    .catch((error) => {console.log(error)});
    // To Do tomorrow too tyried Update averages ask Chris explain ESB stuff !!!!!
  }
};
