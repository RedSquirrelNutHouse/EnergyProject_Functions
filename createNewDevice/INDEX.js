
/**
 * 
 *____          _   ____              _               _ 
 |  _ \ ___  __| | / ___|  __ _ _   _(_)_ __ _ __ ___| |
 | |_) / _ \/ _` | \___ \ / _` | | | | | '__| '__/ _ \ |
 |  _ <  __/ (_| |  ___) | (_| | |_| | | |  | | |  __/ |
 |_| \_\___|\__,_| |____/ \__, |\__,_|_|_|  |_|  \___|_|
                             |_|
 * Owners : RCarroll & CForristal Copyright 2020.                          
 * All of the needed functions for device managment.
 * Base project will use the LOLIN Board to test.
 */

// Added to debug functions in Stackdriver Debug.
// const debug = require('@google-cloud/debug-agent').start({
//     allowExpressions: true,
//     serviceContext: {
//         service: 'functions',
//         version: 'V1.2.0'
//     }
// });

// // Lets the user know its ready to debug,
// debug.isReady().then(() => {
//     debugInitialized = true;  
//     console.log("Debugger is initialize");
// });

const functions = require('firebase-functions');
'use strict';
const fs = require('fs');
const {google} = require('googleapis');
const iot = require('@google-cloud/iot');
var backslash = require('backslash');

// 
/**
 * responceMessage Used to hold all of the responce Data
 * @param {!express:Request} responceMessage HTTP request context.
 * @param responceMessage.data - This is the json object for the data will change per function.
 * @param responceMessage.error - This is the error object contains the feilds to check the resoonce.
 * @param responceMessage.status - This is status True = Error False = No Error.
 * @param responceMessage.code - This is code assigned to the Error.
 * @param responceMessage.description - This is description of the Error.
 */
var responceMessage = {
data : null,
error : {
    status : false,
    code : 0,
    description: ""
}
}

// Used to reset the responce Message.
function resetMessage()
{
    responceMessage = {
        data : null,
        error : {
            status : false,
            code : 0,
            description: ""
        }
    }
}

/**
 * addDevice allows a user to add a device to a Regsistry.
 * @param {!express:Request} data on Call data.
 * @param data.projectId - This is teh project ID gotten from the home page of the project.
 * @param data.cloudRegion - This is the region the project device is in gotten from the device reg.
 * @param data.registryId - This is the device reg id.
 * @param data.deviceId - This is the device id found in the required Reg.
 * @param data.commandMessage - This is the devicecommand and is generally a JSON object.
 * @param {!express:Response} return HTTP response context.
 * @param return.responceMessage - This is the device responce to the command and is generally a JSON object.
 * @param responceMessage.data - This is the json object for the data will change per function.
 * @param responceMessage.error - This is the error object contains the feilds to check the resoonce.
 * @param responceMessage.status - This is status True = Error False = No Error.
 * @param responceMessage.code - This is code assigned to the Error.
 * @param responceMessage.description - This is description of the Error.
 */



exports.createNewDevice = (req, res) => {
    resetMessage();
    console.log('Started');
    console.log(req.body);
    var data = req.body;
    
    // Take the data from the request.
    const projectId = data.projectId;
    console.log(projectId);
    const cloudRegion = data.cloudRegion;
    console.log(cloudRegion);
    const registryId = data.registryId;
    console.log(registryId);
    const deviceId = data.deviceId;
    console.log(deviceId);
    const publicKeyFormat = data.publicKeyFormat;
    console.log(publicKeyFormat);
    const publicKeyFile = data.publicKeyFile;
    
    const iotClient = new iot.v1.DeviceManagerClient({
    // optional auth parameters.
    });
    var keytoUse = backslash(publicKeyFile);
    console.log(keytoUse);
    
    const regPath = iotClient.registryPath(projectId, cloudRegion, registryId);
    // Create the device . 
    const device = {
      id: deviceId,
      credentials: [
        {
          publicKey: {
            format: publicKeyFormat,
            key: publicKeyFile,
          },
        },
      ],
    };
  
    const request = {
      parent: regPath,
      device,
    };
    return iotClient.createDevice(request).then(responses => {
        const response = responses[0];
        console.log('Created device', response);
        res.status(200).send(response);
      } ).catch(error => {
        responceMessage.data = error;
        responceMessage.error.status = true;
        responceMessage.error.code = 4;
        responceMessage.error.description = `Failed create the device ${deviceId}` ;
        // 403  Device Error or NO device.
        res.status(403).send(responceMessage);
        return responceMessage;
    });
      
    // Public key ec_public.pem
};




