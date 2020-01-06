/**
 * Triggered by a Create to a Firestore document for the Settings.
 * 
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */

'use strict';
const {google} = require('googleapis');
const admin = require('firebase-admin');

// ---------------------- Gobals ------------------------
// In the case the devices change update or we might add more overload options.
const projectId = 'redsquirrel-energyproject';
const cloudRegion = 'europe-west1';
const registryId = 'RedsquirrelNutHouse';
var DeviceSettings = null;

// Init the Cloud Firestore 
admin.initializeApp();
var db = admin.firestore();
db.settings( { timestampsInSnapshots: true });


exports.deviceSettingsUpdate = (event, context, finished) => {
  const resource = context.resource;
  // get the device id
  var deviceIdString = resource.split("/");
  // First we get the data from the caller 6 = device id
  var deviceIdForFireBase = deviceIdString[6];
  // As we use iot for devices and real name for the database
  var deviceId = 'iot_';
  deviceId = deviceId.concat(deviceIdForFireBase); 
  //console.log('Started to send default settings');
  // We need the settings for the device this is always a map called deviceSettings
  var deviceDoc = db.collection('devices').doc(deviceIdForFireBase).collection('deviceSettings').doc('Settings'); 
  //console.log('Loading Settings Doc');
  // Try and return the doc
  // P1 START
  var deviceDocObj = deviceDoc.get()
  // P1 THEN
  .then(doc => {
    // If it exists read the doc and it will have the device settings
    if (doc.exists) 
    {
      // get the device settings
      DeviceSettings = doc.data(); 
      // google Auth open a server side auth client
      // P2 START + P2 THEN
      google.auth.getClient().then(client => {
        google.options({
          auth: client
        });
       // console.log('Preparing to Send Device Update');
        const parentName = `projects/${projectId}/locations/${cloudRegion}`;
        const registryName = `${parentName}/registries/${registryId}`;
        const binaryData = Buffer.from(JSON.stringify(DeviceSettings)).toString('base64');
        // Create the request
        const request = {
          name: `${registryName}/devices/${deviceId}`,
          versionToUpdate: 0,
          binaryData: binaryData
        };
       // console.log('Sending Update to device');
          // P3 START +   P3 THEN
        google.cloudiot('v1').projects.locations.registries.devices.modifyCloudToDeviceConfig(request).then(result => {console.log(result); finished();});
     })
    .catch(err => {
      console.log('Error getting document');
        finished();
    });

      // return ok as device iot accepted 
    }
    else 
    {
      // Else we have no settings
      console.log( 'The device has no settings!');
      finished();
    }
  })
    // P1 CATCH
  .catch(err => {
    console.log('Error getting document');
    finished();
  });
};
// [END iot_relay_message_js]
