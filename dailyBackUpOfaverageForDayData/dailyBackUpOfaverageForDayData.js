const admin = require('firebase-admin');
admin.initializeApp();
var db = admin.firestore();
db.settings( { timestampsInSnapshots: true });
/**
 * On the GCP Scheduler we take the daily BackUp Of the averageForDayData
 * This means we can do averages over days weeks years no need to keep it all together as mostly by day
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
exports.dailyBackUpOfaverageForDayData = (req, res) => {
  let timeYesterday = admin.firestore.Timestamp.now().toMillis() - 86400000;
  console.log("Backup Started");
  // We get all of the devices and if the device was online on that day we backup the data. 
  deviceDoc = db.collection('devices').get()
  .then(snapshot => {
    // Process the snapshot
    let backUps = [];
    snapshot.forEach((doc) => {
      	// If the device Online for the day before then we backup
      	if (doc.data().deviceStatus.deviceLastOnline.toMillis() > timeYesterday )
        {
          let dataToBackUp = { 
            dataDate: admin.firestore.Timestamp.fromMillis(timeYesterday),
            averageForDayData: doc.data().averageForDayData,
            deviceId: doc.data().deviceId
          };
          backUps.push(dataToBackUp);
        }
    });
    return backUps;
      
  }).then(function(result) { // (***)
    let promises = [];
    // Next we take each of the devices and create a promise for each of the backups.
    result.forEach((doc) =>{
    	// We raise a promise
      	let promiseToAdd = db.collection('devices').doc(doc.deviceId).collection('backUps').doc()
      	.set(doc)
      	.then(()=>{console.log("Update Done!");})
      	.catch((error) =>{console.log(error);});
      	promises.push(promiseToAdd);
    });
    // Wait for Promises to resolve
    Promise.all(promises).then(function(values) {
      console.log(values);
    });
    
    res.status(200).send("BackUp Done");

})
  .catch((error) =>{
    console.log(error);
    res.status(500).send(error);
  });
     
  

};
