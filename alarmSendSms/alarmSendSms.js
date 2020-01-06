/**
 * Triggered by a change to a Firestore document.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
'use strict';
const {google} = require('googleapis');
const admin = require('firebase-admin');
const twilio = require('twilio');

const accountSid = 'AC5d6613bde4d76ffc7ffc39053c9ea19b';
const authToken  = 'd8bf1819479cf07c64d0b957c8167d1e';

const client = new twilio(accountSid, authToken);

const twilioNumber = '+19142905027' // redSquirrelIreland twilio phone number

// Init the Cloud Firestore 
admin.initializeApp();
var db = admin.firestore();
db.settings( { timestampsInSnapshots: true });

exports.alarmSendSms = (event, context) => {
  const resource = context.resource;
  // log out the resource string that triggered the function
  console.log('Function triggered by change to: ' +  resource);
  // now log the full event object
  console.log(JSON.stringify(event));
  var dataFromAlarm = JSON.stringify(event.value.fields.CustomerName.stringValue);
  console.log(event.value.fields.siteName.stringValue);
  db.collection('userLists').doc(event.value.fields.siteName.stringValue).get()
  .then((userList)=>{
  var list = userList.data().Users;
  console.log(list);
  list.forEach((user)=>{
	// Create the message to send the end user
    var message = "Hey " + user.Name + " , There was a alarm raised for " + event.value.fields.siteName.stringValue + " the alarm is " + event.value.fields.alarmDescription.stringValue +  " and the device name is " + event.value.fields.deviceName.stringValue + " the sensor name is " + event.value.fields.sensor.stringValue + " the sensor is located " + event.value.fields.sensorLocation.stringValue + " Please login to www.MemsIreland.com for more infomation on the alarm ";
 	// Construct the message.
    const textMessage = 
          {
            body: message,
            to: user.Phone,  // Text to this number
            from: twilioNumber // From a valid Twilio number
          };
  // Send the message
  return client.messages.create(textMessage).then(message => console.log('success message Sent :)'))
  .catch(err => console.log(err));
  });
  })
  .catch((error)=>{console.log(error);});
};
