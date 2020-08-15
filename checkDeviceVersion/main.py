from flask import jsonify
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

def checkOrCreateDevice(request):
    """
    Created By Rob C and Chris F 
    Allows a device to query its type and version Via the Cloud this also uses Firebase to check the device allocation
    """
    # Get the request data
    deviceID = request.args.get('deviceID')
    key = request.args.get('key')
    action = request.args.get('action')
    print ('deviceId = {0} and the action is {1} and the key is {2}'.format(deviceID,action,key))

    # Below id the responce Object
    responce = { 'fwVersion' : '123', 'repo': 'Energy_Meter', 'error': { 'status': False, 'code': 0000 , 'source': ''}}

    # Get the Current Version.
    # using an access token
    g = Github("0223aca291f8563ab90f27945f0ba89b3f09d7de")
    repository = g.get_user().get_repo('Energy_Meter')
    file_content = repository.get_contents('readEnergyMeter.py') #'readEnergyMeter.py'
    print(file_content.last_modified)

    if action == 'create':
        print ('creating new device {0}'.format(deviceID))
        return jsonify(responce)
    elif action == 'getVersion':
        print ('checking version of FW for the device {0}'.format(deviceID))
        devices_ref = db.collection(u'devices').document(deviceID)
        doc = devices_ref.get()
        if doc.exists:
            print(f'Device data: {doc.to_dict()}')
        else:
            print(u'No Device document!')
        return jsonify(responce)
                
    else:
        responce.fw = ''
        responce.repo = ''
        responce.error.status = True
        responce.error.code = 400
        responce.source = 'No action specified !'
        return jsonify(responce)
