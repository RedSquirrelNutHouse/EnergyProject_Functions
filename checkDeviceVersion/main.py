from flask import jsonify
from flask import abort
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from github import Github
import base64

project_id = 'redsquirrel-energyproject'
# Use the application default credentials
cred = credentials.ApplicationDefault()
firebase_admin.initialize_app(cred, {
  'projectId': project_id,
})

db = firestore.client()

# Created to allow the user to Check a from Python
# Requied that a user understand the IOT platform but no essential 
# The Device Is configured and on a possitive responce i.e 403 bad or 200 good
#  * checkDeviceVersion allows a user to chaeck a device in FB.
#  * @param {!express:Request} data on Call data.
#  * @param data.firmwareVersion - This is the firmware of the device.
#  * @param data.gitUpdateFile - This is the repo folder and file that a update needs to come from
#  * @param data.deviceId - This is the device id found in the required Reg.
#  * @param {!express:Response} return HTTP response context.
#  * @param return.responceMessage - This is the device responce to the command and is generally a JSON object.
#  * @param responceMessage.data - This is the json object for the data will change per function.
#  * @param responceMessage.error - This is the error object contains the feilds to check the resoonce.
#  * @param responceMessage.status - This is status True = Error False = No Error.
#  * @param responceMessage.code - This is code assigned to the Error.
#  * @param responceMessage.description - This is description of the Error.

def checkDeviceVersion(request):
    """
    Created By Rob C and Chris F 
    Allows a device to query its type and version Via the Cloud this also uses Firebase to check the device allocation
    """
    # Get the request data
    deviceId = request.args.get('deviceId')
    firmwareVersion = request.args.get('firmwareVersion')
    gitUpdateFile = request.args.get('gitUpdateFile')
    print ('deviceId = {0} and the gitUpdateFile is {1} and the firmwareVersion is {2}'.format(deviceId,gitUpdateFile,firmwareVersion))

    # Below id the responce Object
    responce = { 'deviceNeedsUpdate': False, 'deviceExists':False, 'firmwareVersion' : '', 'gitUpdateFile': '', 'error': { 'status': False, 'code': 0000 , 'source': ''}}
    # Github repo for the Projects
    g = Github("5f0dec0dd5eea323b7f678a8c8fff92cf09d5e29")
    headers = {
    'Access-Control-Allow-Origin': 'https://mydomain.com',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Authorization',
    'Access-Control-Max-Age': '3600',
    'Access-Control-Allow-Credentials': 'true'
    }

    print ('checking version of FW for the device {0}'.format(deviceId))
    # First we need to check the version of the device in the Repo.
    devices_ref = db.collection(u'devices').document(deviceId)
    doc = devices_ref.get()
    if doc.exists:
      print(f'Device data: {doc.to_dict()}')
      deviceData = doc.to_dict()
      fb_deviceAutoUpdate = deviceData['deviceStatus']['autoUpdate']
      fb_gitUpdateFile = deviceData['deviceStatus']['gitUpdateFile'] 
      fb_firmwareVersion = deviceData['deviceStatus']['firmwareVersion'] 
      # Device exists
      responce['deviceExists'] = True
      # Here we check if autoupdate if so we need to check the bit and ensure its at the right version.
      if fb_deviceAutoUpdate == True and fb_gitUpdateFile == gitUpdateFile: # Auto Update On
        if fb_gitUpdateFile != None :
          repository = g.get_user().get_repo('RemoteDeviceUpdate')
          file_content = repository.get_contents(fb_gitUpdateFile)
          # Compare the date and Time of the Update File
          if file_content.last_modified != firmwareVersion :
            # Needs a update
            responce['deviceNeedsUpdate'] = True
            responce['firmwareVersion'] = file_content.last_modified
            responce['gitUpdateFile'] = fb_gitUpdateFile
            return (jsonify(responce), 200, headers)
          else :
            responce['deviceNeedsUpdate'] = False
            responce['firmwareVersion'] = file_content.last_modified
            responce['gitUpdateFile'] = fb_gitUpdateFile
            return (jsonify(responce), 200, headers)
      elif fb_gitUpdateFile != gitUpdateFile : # Else the File has changed i.e. new device type or first update
        if fb_gitUpdateFile != None :
            repository = g.get_user().get_repo('RemoteDeviceUpdate')
            file_content = repository.get_contents(fb_gitUpdateFile)
            # Needs a update
            responce['deviceNeedsUpdate'] = True
            responce['firmwareVersion'] = file_content.last_modified
            responce['gitUpdateFile'] = fb_gitUpdateFile
            return (jsonify(responce), 200, headers)
        else :
          print(u'No Device Settings')
          responce['error']['status'] = True
          responce['error']['code'] = 2
          responce['error']['source'] = 'device has not been configured'
          return (jsonify(responce), 403, headers)
      elif fb_gitUpdateFile == None : # Or no device settings at all
        print(u'No Device Settings')
        responce['error']['status'] = True
        responce['error']['code'] = 2
        responce['error']['source'] = 'device has not been configured'
        return (jsonify(responce), 403, headers)
      else :
        responce['firmwareVersion'] = fb_firmwareVersion
        responce['gitUpdateFile'] = fb_gitUpdateFile
        return (jsonify(responce), 200, headers)
    else:
      print(u'No Device document!')
      responce['error']['status'] = True
      responce['error']['code'] = 1
      responce['error']['source'] = 'device dose not exist'
      return (jsonify(responce), 403, headers)
