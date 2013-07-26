

var express = require('express')
    , app = module.exports = express();
var http = require('http'),
		server = http.createServer(app);
var io = require('socket.io').listen(server);

var fs = require('fs');
var crypto = require('crypto');

var sys = require('sys')
var exec = require('child_process').exec;

var moment = require('moment');

var spawn = require('child_process').spawn;

var walk = require('walk');

var events = require('events');
var eventEmitter = new events.EventEmitter();

var path = require('path');
 
// Using the .html extension instead of
// having to name the views as *.ejs
app.engine('.html', require('ejs').__express);
 
// Set the folder where the pages are kept
app.set('views', __dirname + '/views');
 
// This avoids having to provide the 
// extension to res.render()
app.set('view engine', 'html');

//READ CONFIG FILE:
var config;
var file =  'e4a_config.json'; 
/*fs.readFile(file, 'utf8', function (err, data) {
  if (err) {
    console.log('Error: ' + err);
    return;
  }
});
*/
var data = fs.readFileSync( path.resolve(__dirname, file), 'utf8');
config = JSON.parse(data);
console.dir(config);

var globalStatus = {
	totalSteps:0,
	currentStep:-1,
	percentDone:0,
	taskType:'',
	staticStatusInfo : {},
	dynamicStatusInfo : {}

};

var e4aVersion = '1.0';
var evidenceMediaPath = config.evidenceMediaPath;
var writeableMediaPath = config.writeableMediaPath;
var evidenceMediaLookPath = config.evidenceMediaLookPath;
var writeableMediaLookPath = config.writeableMediaLookPath;


var evidenceMediaList = []; 
var writeableMediaList = [];
if(fs.existsSync(evidenceMediaLookPath) ) { 
	evidenceMediaList = fs.readdirSync(evidenceMediaLookPath );
}
if(fs.existsSync(writeableMediaLookPath ) ) {
	writeableMediaList = fs.readdirSync(writeableMediaLookPath );
}

var blankDvdInserted = 0;
var lookForDiscToHash = '';
var dataToSend;;
var currentEvent = ''; 
var metaData = []; 
var firstHashArr = {}; 
var secondHashArr = {}; 

// Serve the index page
app.get('/', function(req, res){
	globalStatus.totalSteps=0;
	globalStatus.currentStep=-1;
	globalStatus.percentDone=0;
	globalStatus.taskType='';
	globalStatus.staticStatusInfo={};
	globalStatus.dynamicStatusInfo = {};

  res.render('index', {
    pageTitle: 'Easy Forensic Acquisition',
    evidenceMediaList: evidenceMediaList
  });
});

// Serve the selectEvidence page
app.get('/usbAcquire.html', function(req, res){
  res.render('usbAcquire', {
    evidenceMediaList: evidenceMediaList
  });
});

app.get('/opticalAcquire.html', function(req, res){
  res.render('opticalAcquire', {
    evidenceMediaList: evidenceMediaList
  });
});


app.get('/process.html', function(req, res){
  res.render('process', {
    pageTitle: 'Easy Forensic Acquisition',
    evidenceMediaList: evidenceMediaList
  });
});

app.get('/error.html', function(req, res){
  res.render('error', {
  });
});





app.use(express.static( path.resolve(__dirname, "../E4A" ) ) );
 
if (!module.parent) {
  server.listen(8888);
  console.log('EasyForensicAcquisition Server Started on port 8888');
}


/*
var child = require('child_process').execFile('../scripts/monitorDriveLocations.pl', [ 
     ], {
		detached: true,
		stdio: ['ignore', 1, 2 ]
}); 

child.unref();
// use event hooks to provide a callback to execute when data are available: 
child.stdout.on('data', function(data) {
    console.log(data.toString()); 
});

child.stderr.on('data', function(data) {
    console.log(data.toString()); 
});
*/


// INTERVAL FOR CHECKING :
// evidenceMedia & writeableMedia 
// once per second for drives.
var interval;

io.sockets.on('connection', function (socket) {
clearInterval(interval);
socket.emit('evidenceMediaList',   evidenceMediaList );
socket.emit('writeableMediaList',   writeableMediaList );
socket.emit("blankDvdStateChange", blankDvdInserted);

interval = setInterval( function() {
	var oldEMList = evidenceMediaList.slice();
	if(fs.existsSync(evidenceMediaLookPath ) ) {
		evidenceMediaList = fs.readdirSync(evidenceMediaLookPath);
	} else {
		evidenceMediaList = [];
	}
	//NEED TO UPDATE LIST THAT IS SHOWN.
	if(oldEMList.length != evidenceMediaList.length || 
			! oldEMList.every(function(u, i) {
				return u === evidenceMediaList[i];
			} )  ) {
			console.log("evidenceMediaList contents changed!");
			console.dir(evidenceMediaList);	
			socket.emit('evidenceMediaList',   evidenceMediaList );

	}

	var oldWMList = writeableMediaList.slice();
	if(fs.existsSync(writeableMediaLookPath ) ) {
		writeableMediaList = fs.readdirSync(writeableMediaLookPath);
	} else {
		writeableMediaList = [];
	}

	//NEED TO UPDATE LIST THAT IS SHOWN.
	if(oldWMList.length != writeableMediaList.length || 
			! oldWMList.every(function(u, i) {
				return u === writeableMediaList[i];
			} )  ) {
			console.log("writeableMediaList contents changed!");	
			console.dir(writeableMediaList);	
			socket.emit('writeableMediaList',   writeableMediaList );

	}
	//CHECK TO SEE IF BLANK DVD INSTALLED
	exec('/lib/udev/cdrom_id --lock-media '+config.dvdWriteDevice, function(err, stdout, stderr) {
		if(err) {
//			console.log("ERROR disc check exec failed! "+err);
		}
		var oldBlankDvd = blankDvdInserted;
		if( stdout.indexOf('ID_CDROM_MEDIA_STATE=blank') != -1 ) {
			blankDvdInserted = 1;
		} else {
			blankDvdInserted = 0;
		}
		if(blankDvdInserted != oldBlankDvd) {
			socket.emit("blankDvdStateChange", blankDvdInserted);
			console.log("blankDvdStateChangeCalled! blankDvdInserted="+blankDvdInserted);
		}
	} );
	
	//LOOK FOR DISC TO HASH (THIS IS FOR DISC THAT WAS JUST BURNED )
	if( lookForDiscToHash != '')  {
		writeableMediaList.forEach( function( theFile) {
			if( theFile == lookForDiscToHash ) {
				lookForDiscToHash = '';
				hashFiles(dataToSend, 'HashDVD' );	
				
			}
		} );
	}

	// STATUS CHECKS :
	if ( globalStatus.totalSteps > 0 ) {
		if ( globalStatus.currentStep < globalStatus.totalSteps ) {
//			globalStatus.percentDone++;
			socket.emit('statusUpdate', globalStatus );
		} else {
					

		}
	}


}, 2000);


	
  socket.on('beginProcessing', function (data) {
    console.dir(data);

			metaData = [];
			metaData.push( '### EasyForensicAquisition Evidence Hash Report\n');
			metaData.push( '### Evidence Selected : '+data.selectedEvidence+'\n');
			if(data.userMeta) {
				for(var key in data.userMeta) {
					var prefix = '### UserMeta: '+key+' : ';
					data.userMeta[key] = data.userMeta[key].replace(/\n/g, '\n'+prefix);
					metaData.push( prefix+data.userMeta[key]+'\n');
				} 
			}

			console.log("### Calling hashFiles###");

			globalStatus.totalSteps = data.requestedOps.length;
			globalStatus.currentStep = 1;
			globalStatus.percentDone = 0;
			globalStatus.taskType = data.taskType;

			hashFiles(data, 'HashEvidence' );	


  });

//BEGIN ejectDrives
socket.on('ejectDrives', function (data) {
	console.log("ejectDrives called!");
	ejectDrives();
} );
//END ejectDrives


var ejectDrives = function() {
	if(config) {
		if(config.dvdEvidenceDevice) {
			exec("eject "+config.dvdEvidenceDevice);
		}
		if(config.dvdWriteDevice) {
			exec("eject "+config.dvdWriteDevice);
		}
	}

};


//BEGIN checkForDrives
socket.on('checkForDrives', function (data) {
	console.log("checkForDrives called!");
	socket.emit('evidenceMediaList',   evidenceMediaList );
	socket.emit('writeableMediaList',   writeableMediaList );
	socket.emit("blankDvdStateChange", blankDvdInserted);

} );
//END checkForDrives

//BEGIN checkStatus
socket.on('checkStatus', function (data) {
	console.log("checkStatus called!");

		socket.emit('statusUpdate', globalStatus );

		var outfileName = 'test';
//		socket.emit('processingComplete', {'outfileName': outfileName} );
} );
//END checkStatus

//BEGIN fileHashingComplete
var fileHashingComplete = function( outfileArr, folderHashed, data, theOperation) {
//	console.log("TEST TEST TEST fileHashingComplte CALLED ======\n");
//		var outfileName = 'test';
//		socket.emit('processingComplete', {'outfileName': outfileName} );
	// TESTING ONLY TO REMOVE

		var outfileData = '';
		metaData.push( '### Complete Hash Computation at '+moment().format('YYYY-MM-DD HH:mm:ss')+'.\n' ) ;	
//		metaData.forEach( function(line,ind) {
//			outfileData += line;
//		} );
//		outfileData += '#################### BEGIN FILE HASH LIST FOR: '+evid+' ####################\n';
		metaData.push( '#################### BEGIN FILE HASH LIST FOR: '+folderHashed+' ####################\n');
		outfileArr.forEach( function(line,ind) {
//			outfileData += line;
			metaData.push( line );
		} );
//		outfileData += '####################  END FILE HASH LIST FOR: '+evid+'  ####################\n';
		metaData.push('####################  END FILE HASH LIST FOR: '+folderHashed+'  ####################\n');
//		exec("scripts/unmountAll.sh");
//		socket.emit('processingComplete', {'outfileName': outfileName} );

		console.log("#### TEST #### theOperation:"+theOperation);
//		eventEmitter.emit('e4aProcess', data, theOperation  );
		e4aProcess(data, theOperation);
};


// BEGIN burnDVD function
var burnDVD = function( data ) {

	var discName = data.selectedEvidence.replace(/^\w+_/,''); 
	var fullSelectedPath = evidenceMediaPath+'/'+data.selectedEvidence;
	console.log("burnDVD: discName="+discName+" fullSelectedPath="+fullSelectedPath);

 	var burnProcess = spawn('growisofs', ['-udf', '-Z', config.dvdWriteDevice, '-V', discName, fullSelectedPath ] );

	burnProcess.stdout.on('data', function(data) {
		console.log('burnProcess stdout: ' + data);
	});	

	burnProcess.stderr.on('data', function(data) {
		console.log('burnProcess stdout: ' + data);
	});	

	burnProcess.on('close', function (code) {
		console.log('burnProcess child process exited with code ' + code);
//		eventEmitter.emit('e4aProcess', data , 'BurnDVD' );
		if(code == 0) {
			e4aProcess( data,'BurnDVD');
		} else if( code == 252 ) {
  		console.log('Caught exception: ' + err);
			socket.emit("errorCaught", err);	
		}
	});

	//temp testing only
//		eventEmitter.emit('e4aProcess', data , 'BurnDVD' );
//	e4aProcess(data,'BurnDVD');

};
// END burnDVD function


var hashFiles = function(data, theOperation) {


		metaData.push( '### Starting Hash Computation at '+moment().format('YYYY-MM-DD HH:mm:ss')+'.\n' ) ;	
		console.log("hashFiles function called. theOperation = "+theOperation);
		var outfileData = [];	
		var hashProcessStatus = [];

		var sourceName = '';
		var theFullSourcePath = '';
		
		if(theOperation == 'HashEvidence' ) {
			sourceName = data.selectedEvidence.replace(/^\w+_/,''); 
			theFullSourcePath = evidenceMediaPath+'/'+data.selectedEvidence;
		} else if (theOperation == 'HashDVD' ) {
			sourceName = data.selectedEvidence.replace(/^\w+_/,''); 
			theFullSourcePath = writeableMediaPath+'/'+'OPTICAL_'+sourceName;
		}

		console.log("sourceName="+sourceName+", theFullSourcePath="+theFullSourcePath);

		var fileList =[];
		var walker  = walk.walk(theFullSourcePath, { followLinks: false });
		walker.on('file', function(root, stat, next) {
			var basePath = root.replace(theFullSourcePath,'');
	    // Add this file to the list of files
			var filename;
			if(basePath != '') {
//		    fileList.push(basePath + '/' + stat.name);
				filename = basePath.substr(1) + '/' +stat.name;
			} else {
//		    fileList.push( stat.name);
				filename = stat.name;
			}
			fs.readFile(root+'/'+stat.name, function (error, data) {
				var shasum = crypto.createHash('sha256');
				shasum.update(data);
				var d = shasum.digest('hex');
				console.log(d + '  ' + filename);
				outfileData.push( d + '  ' + filename + "\n" );
				if(theOperation == 'HashEvidence' ) {
					firstHashArr[filename] = d;
				} else {
					secondHashArr[filename] = d;
				}

	    	next();
			});
		});	
		walker.on('end', function() {
			fileList.forEach(function( filename, index ) {
						console.log("filename======"+filename);
/*						var shasum = crypto.createHash('sha256');
						shasum.update(data);
						var d = shasum.digest('hex');
						console.log(d + '  ' + filename);
						outfileData[index] =  d + '  ' + filename + "\n";
*/			} );
			fileHashingComplete( outfileData, sourceName, data, theOperation); 
			
		});	

/*
  	fileList = fs.readdirSync(theFullSourcePath);
			var readFiles = function( index) {
				if(index == fileList.length) {
					fileHashingComplete( outfileData, sourceName, data, theOperation); 
				} else {
					var filename = fileList[index];
					console.log("Calculating Hash Digest for :"+filename);	

				var s = fs.readFile( theFullSourcePath+'/'+fileList[index], function(error, data) {
//					console.log("reading file="+fileList[index]);

					if( error) {
						console.log( "ERROR::: Error Reading File. ", error);
					} else {
						var shasum = crypto.createHash('sha256');
						shasum.update(data);
						var d = shasum.digest('hex');
//						console.log(d + '  ' + filename);
						outfileData[index] =  d + '  ' + filename + "\n";
						
						readFiles( index + 1);
					}
				});
			}
			};
			readFiles(0);		
*/

};
// END hashFiles

var e4aProcess = function (data, finishedOp) {	

	if( finishedOp == currentEvent) {
		return;
	}
	currentEvent = finishedOp;

		var outfileName = moment().format('YYYYMMDD_HHmm');	
		var sourceName = data.selectedEvidence.replace(/^\w+_/,''); 
		outfileName = outfileName + '_FileHash_'+sourceName+'.txt';
		globalStatus.staticStatusInfo['Selected Input (Evidence) Drive'] = data.selectedEvidence;
		globalStatus.staticStatusInfo['Hash Report File'] = outfileName;
		globalStatus.staticStatusInfo['Selected Drive for Report File'] = data.selectedDestination;

	globalStatus.currentStep++;
	globalStatus.percentDone = ( globalStatus.currentStep/globalStatus.totalSteps ) * 100;
	globalStatus.dynamicStatusInfo['Processing Step'] = globalStatus.currentStep+" / "+globalStatus.totalSteps;

	var opsList = data.requestedOps;
	if ( finishedOp == 'HashEvidence' ) {
		console.log("######### calling burnDVD from event handler ######"+finishedOp);
	
		burnDVD( data );

	} else if ( finishedOp == 'BurnDVD' ) { 
		dataToSend = data;
		lookForDiscToHash = 'OPTICAL_'+data.selectedEvidence.replace(/^\w+_/,'');	
//		hashFiles(data, 'HashDVD' );	
	} else if ( finishedOp == 'HashDVD' ) { 
		verifyHash(data, 'VerifyMatch' );
	} else if ( finishedOp == 'VerifyMatch' ) { 

//		var outfileName = moment().format('YYYYMMDD_HHmm');	
//		var sourceName = data.selectedEvidence.replace(/^\w+_/,''); 
//		outfileName = outfileName + '_FileHash_'+sourceName+'.txt';
//		globalStatus.staticStatusInfo['Hash Report File'] = outfileName;
		var outfileFull = writeableMediaPath+'/'+data.selectedDestination+'/'+outfileName;
		var outfileData = '';
		metaData.forEach( function(line,ind) {
			outfileData += line;
		} );
		fs.writeFile(outfileFull, outfileData, function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log("FileHashReport successfully written!\nPath:"+outfileFull);
			}
		} );

		exec("sync");

		globalStatus.totalSteps = 0;
		globalStatus.currentStep = -1;
		socket.emit('processingComplete', {'outfileName': outfileName} );
		ejectDrives();
		
	} 
} ;
//END eventEmitter.on e4aProcess


var verifyHash = function(data, theOperation) {
		console.log("#### VERIFY HASHES CALLED ####");
		data.hashVerified = 0;
		if(firstHashArr && secondHashArr ) {
			for (var fName in firstHashArr) {
//				console.log("Comparing Hash: "+fName+"\n"+firstHashArr[fName]+"\n"+secondHashArr[fName] );
				if( ! secondHashArr[fName] || secondHashArr[fName] != firstHashArr[fName] ) {
					data.hashVerified = -1;
				}
			}
			for (var fName in secondHashArr) {
				if( ! firstHashArr[fName] || firstHashArr[fName] != secondHashArr[fName] ) {
					data.hashVerified = -2;
				}
			}
		} else {
			data.hashVerified = -3;
		}
		if(data.hashVerified == 0) {
			metaData.push( '### Hashes Match ###\n' ) ;	
		} else if ( data.hashVerified == -1 ) {
			metaData.push( '### Hashes Do NOT Match - Discrepency in first hash list ###\n' ) ;	
		} else if ( data.hashVerified == -2 ) {
			metaData.push( '### Hashes Do NOT Match - Discrepency in second hash list ###\n' ) ;	
			} else if ( data.hashVerified == -3 ) {
			metaData.push( '### Hashes Do NOT Match - Did not have two hash sets to compare ###\n' ) ;	
		}
		console.log("#### VERIFY HASH COMPLETE. RESULT="+data.hashVerified+" ####");
//		eventEmitter.emit('e4aProcess', data , 'VerifyMatch' );
		e4aProcess(data, 'VerifyMatch');
}


// unhandled Exceptions go here :
process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
	socket.emit("errorCaught", err);	
});




} );
// END SOCKET.IO WRAPPER





