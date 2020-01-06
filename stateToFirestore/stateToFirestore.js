const admin = require('firebase-admin');
admin.initializeApp();
var db = admin.firestore();
db.settings( { timestampsInSnapshots: true });

/**
 * Background Cloud Function to be triggered by Pub/Sub.
 * This function gets executed when state data and gets the data from the MEMS device and
 * send to IoT Core and consequently a Pub/Sub message
 * gets published to the selected topic in this case the state info.
 *
 * @param {Object} event The Cloud Functions event.
 * @param {Function} callback The callback function.
 */
exports.stateToFirestore = (event, callback) => {
  
  // Step one get the pub sub state info.
  const pubsubMessage = event.data;
  //console.log(pubsubMessage);

  let data = event.data;
  let buff = new Buffer(data, 'base64');
  let jsonText = buff.toString('ascii');
  console.log(jsonText);
  const stateData = JSON.parse(jsonText);
  const MEMSdeviceId = stateData.deviceid;
  const MEMSdeviceType = stateData.deviceType;
  const MEMSdeviceStatus = stateData.deviceStatus;
  const MEMSfirmwareVersion = stateData.firmwareVersion;
  const MEMSsettingsVersion = stateData.settingsVersion;
  // Used for Promise.all ..
  var deviceDoc;
  var deviceDocObj;
  var deviceDocUpdate;
  var deviceDocSettingsUpdate;
  var updateDevice;
  
  // Step Two Check if the device Exists
  deviceDoc = db.collection('devices').doc(MEMSdeviceId);
  // Try and return the doc
  deviceDocObj = deviceDoc.get()
    .then(doc => {
        if (!doc.exists) {
            // We hold the value of the Settings Object here
            let MEMSDeviceSettings = null;
          	updateDevice = null;
            console.log('No such document!');
          
            let deviceSettingDoc = db.collection('default_Settings').doc(MEMSdeviceType);
            var settingDefault = deviceSettingDoc.get().then(doc => {
             console.log('Settings gotten');
             console.log(doc.data().Settings);
              
              MEMSDeviceSettings = doc.data().Settings;
              console.log(MEMSDeviceSettings);
                   // Create Default data Set
            let data = {
              deviceName: '',
              CustomerName: '',
              siteName: '',
              deviceLocation: '',
              deviceId: MEMSdeviceId,
              deviceComment: '',
              averageForDayData: doc.data().averageForDayData,
              deviceStatus: { 
                deviceLastOnline: admin.firestore.FieldValue.serverTimestamp(),
                deviceStatus: MEMSdeviceStatus,
                firmwareVersion : MEMSfirmwareVersion,
                settingsVersion: MEMSsettingsVersion,
                deviceType: MEMSdeviceType
              } 
            };
          
            // Add the new doc for the device.
            deviceDocUpdate = db.collection('devices').doc(MEMSdeviceId).set(data).then(ref => {
              console.log('Added document with ID: ', MEMSdeviceId);
             // return null;
            });
        
            // Next Add the Settings Subcollection Doc
          
            // Add the new doc for the device.
            deviceDocSettingsUpdate = db.collection('devices').doc(MEMSdeviceId).collection('deviceSettings').doc('Settings').set(MEMSDeviceSettings).then(ref => {
              console.log('Added document with ID: ', MEMSdeviceId);
             // return null;
            });
             }).catch(err => {
       		  console.log('Error getting settings document', err);
       			// return null;
   			 });
       
          
       
           
        } else 
        {
          	// To resolve Promise
            deviceDocUpdate = null;
  			deviceDocSettingsUpdate = null;
          
            // Exists we need to update the device Status 
            console.log('Updating document!');
            console.log('Document data:', doc.data());
          	let updateDevice = db.collection('devices').doc(MEMSdeviceId).update({
          		'deviceStatus.deviceStatus': MEMSdeviceStatus,
              	'deviceStatus.firmwareVersion': MEMSfirmwareVersion,
              	'deviceStatus.settingsVersion': MEMSsettingsVersion,
              	'deviceStatus.deviceType': MEMSdeviceType,   
                'deviceStatus.deviceLastOnline': admin.firestore.FieldValue.serverTimestamp()
        	}).then(ref => {
              console.log('Updated document with ID: ', MEMSdeviceId);
             // return null;
            });
            //return null;
        }
    })
    .catch(err => {
        console.log('Error getting document', err);
       // return null;
    });

  Promise.all([deviceDoc, deviceDocObj, deviceDocUpdate, deviceDocSettingsUpdate, updateDevice ]).then(function(values) {
  console.log("Done With all promises");
    return ;
});
 
};
