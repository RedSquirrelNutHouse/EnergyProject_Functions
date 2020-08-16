from flask import jsonify
from flask import abort
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

project_id = 'redsquirrel-energyproject'
# Use the application default credentials
cred = credentials.ApplicationDefault()
firebase_admin.initialize_app(cred, {
  'projectId': project_id,
})

db = firestore.client()

def updateFirmwareVersionInFirebase(request):
    """
    Created By Rob C and Chris F 
    Allows a device to query its type and version Via the Cloud this also uses Firebase to check the device allocation
    """
    # Get the request data
    deviceId = request.args.get('deviceId')
    firmwareVersion = request.args.get('firmwareVersion')
    gitUpdateFile = request.args.get('gitUpdateFile')

    # Below id the responce Object
    responce = { 'deviceUpdateCompleted': False, 'error': { 'status': False, 'code': 0000 , 'source': ''}}

    headers = {
    'Access-Control-Allow-Origin': 'https://mydomain.com',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Authorization',
    'Access-Control-Max-Age': '3600',
    'Access-Control-Allow-Credentials': 'true'
    }
    # First we need to check the version of the device in the Repo.
    try:
        devices_ref = db.collection(u'devices').document(deviceId)
        doc = devices_ref.update({'deviceStatus.firmwareVersion': firmwareVersion})
        responce['deviceUpdateCompleted']= True
        return (jsonify(responce), 200, headers)
    except exceptions.FirebaseError as ex:
        print('Error message:', ex)
        print('Error code:', ex.code) # Platform-wide error code
        print('HTTP response:', ex.http_response) # requests HTTP response object
        responce['error']['status'] = True
        responce['error']['code'] = ex.code
        responce['error']['source'] = ex.http_response
        return (jsonify(responce), 403, headers)
