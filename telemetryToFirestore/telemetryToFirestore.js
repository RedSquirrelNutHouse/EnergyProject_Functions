const admin = require('firebase-admin');
admin.initializeApp();
var db = admin.firestore();
db.settings( { timestampsInSnapshots: true });

/**
 * Background Cloud Function to be triggered by Pub/Sub.
 * This function gets executed when telemetry data and gets the data from the MEMS device and
 * send to IoT Core and consequently a Pub/Sub message
 * gets published to the selected topic in this case the telemetry info.
 *
 * @param {Object} event The Cloud Functions event.
 * @param {Function} callback The callback function.
 */
exports.telemetryToFirestore = (event, callback) => {
  
  // Step one get the pub sub state info.
  const pubsubMessage = event.data;
  //console.log(pubsubMessage);

  let data = event.data;
  let buff = new Buffer(data, 'base64');
  let jsonText = buff.toString('ascii');
  console.log("NEW DATA RECIVED !");
  console.log(jsonText);
  console.log(buff);
  let exists = false;
  //console.log(jsonText);
  var telemetryData = JSON.parse(jsonText);
  const MEMSdeviceId = telemetryData.deviceid;
  var d = new Date(telemetryData.time *1000 );
  console.log("Time IS " +  d );
  //var myFirebaseFirestoreTimestampFromDate = firebase.firestore.Timestamp.fromDate(new Date());
 // telemetryData.time = admin.firestore.FieldValue.serverTimestamp();
  telemetryData.time = admin.firestore.Timestamp.fromDate(d);
  // telemetryData.time = admin.firestore.Timestamp.now();
  var systemcounter = 0;
  
  // Used to ensure finsihed before exit
  var alarmCollection;
  var deviceDoc ;
  var readDevices;
  var pushAlarm;
  var updateDevices;
  
  
  // Add the new document to the MEMS Device sub collection.
  deviceDoc = db.collection('devices').doc(MEMSdeviceId).get()
  .then(ref => {
    console.log('Added document with ID: ', ref.data());
    systemcounter++;
    // Next we must check for Alarms
    if (telemetryData.numberOfAciveAlarms > 0)
    {
      console.log("ALARM ACTIVE !!!");
      // OB 1
      telemetryData.alarms.forEach((alarm) => {
        
          console.log(alarm);
          //Step one is to see if the alarm exists in the Firebase Alarms Table
          // OB 2

          alarmCollection = db.collection('alarms').where('deviceId','==',MEMSdeviceId).where('alarmActive','==',true).where('type','==',alarm.type).where( 'sensor','==',alarm.sensor).get().then((snapshot) => {
            snapshot.forEach( doc =>{
               console.log("ALARM EXISTS !!!");
               exists = true;
           })
           if (exists == false)
           {
            // Get the device Settings
            // OB 3
            console.log("ALARM DOSE NOT Exists !!!");

            readDevices = db.collection('devices').doc(MEMSdeviceId).get().then(device =>{
             console.log(device.data());
             
              // Add the new doc for the device.
                let alarmToAdd = {
                'type' : alarm.type,
                'alarmDescription' :  alarm.description,
                'alarmActive' : true,
                'sensor' : alarm.sensor,
                'deviceId': MEMSdeviceId,
                'comment' : '',
                'alarmCreationDate': admin.firestore.FieldValue.serverTimestamp(),
                'CustomerName': device.data().CustomerName,
                'deviceName' : device.data().deviceName ,
                'siteName' : device.data().siteName ,
                'deviceLocation': device.data().deviceLocation,
                'sensorLocation':alarm.location,
                'ackedDate': admin.firestore.FieldValue.serverTimestamp(),
                'ackedBy' : ''
                };
              // OB 4

              pushAlarm = db.collection('alarms').doc().set(alarmToAdd).then(ref => {
                 console.log('Added Alarm document with ID: ');
              systemcounter++;
                 console.log(ref);
                // return null;
                // CB 4
               });
              // CB 3
              });
             }
            // CB 2
			});
             // once we have the data its time to create the new Alarm
            
      // CB 1     
      });
    }
    else
    {
      // resolve the promises
      alarmCollection = null;
      pushAlarm = null;
      readDevices = null;
    }
    // Next we must check the data for the averages this is for now MEMS Specfic
    let formula = {
        'count' : 0,
        'sensorOneTotal' :0,
        'sensorTwoTotal' :0,
        'sensorThreeTotal' :0,
        'pulseCount' :0,     
    }
    let deviceDate = {
        'sensorOneAverageTemp' : 0,
        'sensorTwoAverageTemp' : 0,
        'sensorThreeAverageTemp' : 0,
        'totalPulseCount' : 0,
    }
    let dataToRemoveValues = null;
    let sensorValues = ref.data().averageForDayData.sensorValues;
    let count = ref.data().averageForDayData.sensorValues.length;
   // console.log('Count is '+ count);
    let timeElaspedInMillsec = 0;
    if (count != 0)
    {
      // If sampling rate changes this could effect this will search for the array of values to remoev
      timeElaspedInMillsec = ref.data().averageForDayData.sensorValues[count-1].time.toMillis()- ref.data().averageForDayData.sensorValues[0].time.toMillis();
     // console.log('Time Differance = ' + timeElaspedInMillsec);
    }
    // Add TelemetryData
    sensorValues.push(telemetryData);
    //let index = 0;
    let counter = 0;
    let Sensor1total = 0;
    let Sensor2total = 0;
    let Sensor3total = 0;
    let PulseCount = 0;
    sensorValues.forEach((reading, index) => {
    //console.log(reading);
    
    if ((telemetryData.time.toMillis() - reading.time.toMillis()) > 86400000)
    {
      sensorValues.splice(index,1); 
     // console.log('Removed '+ index);
    }
    else
    {
      Sensor1total += reading.relayOneSensor;
      Sensor2total += reading.relayTwoSensor;
      Sensor3total += reading.relayThreeSensor;
      PulseCount += reading.pulseCount;
      counter++;
    }
    });
    let averageSensorOne = Sensor1total / counter;
    formula.count = counter;
    deviceDate.sensorOneAverageTemp = Sensor1total / counter;
    deviceDate.sensorTwoAverageTemp = Sensor2total / counter;
    deviceDate.sensorThreeAverageTemp = Sensor3total / counter;
    deviceDate.totalPulseCount = PulseCount ;
    formula.sensorOneTotal = Sensor1total;
    formula.sensorTwoTotal = Sensor2total;
    formula.sensorThreeTotal = Sensor3total;
 	formula.pulseCount = PulseCount;
    // If the time is greater than 12000 = 2 mins
    /*if (timeElaspedInMillsec > 120000)
    {
      console.log('Adding and removing 1');
      console.log(sensorValues);
        // Get the one to remove.
        let dataToRemoveValues = sensorValues[0];
        // Calculate the new total with the old one removed.
        let sensorOneTotal = ref.data().averageForDayData.formula.sensorOneTotal;
        sensorOneTotal = sensorOneTotal - dataToRemoveValues.relayOneSensor;
        // Add the new value.
        sensorOneTotal += telemetryData.relayOneSensor;
        // Update Gobals to be written Back
        deviceDate.sensorOneAverageTemp = sensorOneTotal / (count+1);
        formula.count = count;
        formula.sensorOneTotal = sensorOneTotal;
        // Update the array
        sensorValues.splice(0,1);
        sensorValues.push(telemetryData);
        console.log('Adding and removing 1 DONE');
    }
    else
    {
      console.log('Adding 1');
        // Calculate the new total with the old one removed.
        let sensorOneTotal = ref.data().averageForDayData.formula.sensorOneTotal;
        // Add the new value.
        sensorOneTotal += telemetryData.relayOneSensor;
        // Update Gobals to be written Back
        deviceDate.sensorOneAverageTemp = sensorOneTotal / (count+1);
        formula.count = count + 1; // As zero indexed
        formula.sensorOneTotal = sensorOneTotal;
        sensorValues.push(telemetryData);
        console.log('Added to Array');
        console.log(sensorValues);
    } */

    updateDevices = db.collection('devices').doc(MEMSdeviceId).update({
        'averageForDayData.deviceDate':deviceDate,
        'averageForDayData.formula': formula,
        'averageForDayData.sensorValues': sensorValues

}).then(Responce => {
    console.log('Added NEW Device Data: ');
    console.log(Responce);
      systemcounter++;
   // return null;
     // callback();
  });


 
});
  
Promise.all([deviceDoc,alarmCollection,readDevices,pushAlarm,updateDevices]).then(function(values) {
  console.log("DONE WITH PROMISES!");
 return null;
});  



   
  

}
