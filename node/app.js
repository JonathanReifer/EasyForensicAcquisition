

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

var events = require('events');
var eventEmitter = new events.EventEmitter();
 
// Using the .html extension instead of
// having to name the views as *.ejs
app.engine('.html', require('ejs').__express);
 
// Set the folder where the pages are kept
app.set('views', __dirname + '/views');
 
// This avoids having to provide the 
// extension to res.render()
app.set('view engine', 'html');
 
var evidenceMediaPath = "../testEvidenceDir";
var writeableMediaPath = "../testWriteableMediaDir";
var evidenceMediaLookPath = evidenceMediaPath;
var writeableMediaLookPath = writeableMediaPath;

/*
var evidenceMediaPath = "/evidenceMedia";
var writeableMediaPath = "/writeableMedia";

var evidenceMediaLookPath = "/dev/evidenceDevPart";
var writeableMediaLookPath = "/dev/writeableDevPart";
*/

var evidenceMediaList = []; 
var writeableMediaList = [];
if(fs.existsSync(evidenceMediaLookPath) ) { 
	evidenceMediaList = fs.readdirSync(evidenceMediaLookPath );
}
if(fs.existsSync(writeableMediaLookPath ) ) {
	writeableMediaList = fs.readdirSync(writeableMediaLookPath );
}

var currentEvent = ''; 
var metaData = []; 
var firstHashArr = []; 
var secondHashArr = []; 

// Serve the index page
app.get('/', function(req, res){
  res.render('index', {
    pageTitle: 'Easy Forensic Acquisition',
    evidenceMediaList: evidenceMediaList
  });
});

// Serve the selectEvidence page
app.get('/usbAcquire.html', function(req, res){

/*
	if(fs.existsSync(evidenceMediaLookPath ) ) {
		evidenceMediaList = fs.readdirSync( evidenceMediaLookPath  );
	}
	evidenceMediaList.forEach( function(u, i) {
			console.log(u);
	} );
*/
  res.render('usbAcquire', {
    pageTitle: 'Easy Forensic Acquisition',
    evidenceMediaList: evidenceMediaList
  });
});

app.get('/process.html', function(req, res){
  res.render('process', {
    pageTitle: 'Easy Forensic Acquisition',
    evidenceMediaList: evidenceMediaList
  });
});




app.use(express.static("../E4A") );
 
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
socket.emit('evidenceMediaList',   evidenceMediaList );
socket.emit('writeableMediaList',   writeableMediaList );

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
			metaData.push( '### Starting Hash Computation at '+moment().format('YYYY-MM-DD HH:mm:ss')+'.\n' ) ;	

			console.log("### Calling hashFiles###");
			hashFiles(data, 'HashEvidence' );	


//		} ); 
  });

//BEGIN ejectDrives
socket.on('ejectDrives', function (data) {
	console.log("ejectDrives called!");

} );
//END ejectDrives

//BEGIN ejectDrives
socket.on('checkForDrives', function (data) {
	console.log("checkForDrives called!");
	

} );
//END ejectDrives


//BEGIN fileHashingComplete
//var fileHashingComplete = function(dest, outfileArr, evid, metaData, theOperation) {
var fileHashingComplete = function( outfileArr, folderHashed, data, theOperation) {
	console.log("TEST TEST TEST fileHashingComplte CALLED ======\n");

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



// BEGIN walk function
var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};
// END walk function

// BEGIN burnDVD function
var burnDVD = function( data ) {

	var discName = data.selectedEvidence.replace(/^\w+_/,''); 
	var fullSelectedPath = evidenceMediaPath+'/'+data.selectedEvidence;
	console.log("burnDVD: discName="+discName+" fullSelectedPath="+fullSelectedPath);
/*
 	var burnProcess = spawn('growisofs', ['-udf', '-Z', '/dev/sr1', '-V', discName, fullSelectedPath ] );

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
			setTimeout(e4aProcess,30000, [data,'BurnDVD']);
		}
	});
*/
	//temp testing only
//		eventEmitter.emit('e4aProcess', data , 'BurnDVD' );
	e4aProcess(data,'BurnDVD');

};
// END burnDVD function


//var hashFiles = function(data, metaData, theOperation) {
var hashFiles = function(data, theOperation) {

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

		var fileList;
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

};


//eventEmitter.on('e4aProcess',function( data, finishedOp ) {
var e4aProcess = function (data, finishedOp) {	
	// temp
	data.selectedDestination = 'USB_OutDrive1';
	if( finishedOp == currentEvent) {
		return;
	}
	currentEvent = finishedOp;

	var opsList = data.requestedOps;
	if ( finishedOp == 'HashEvidence' ) {
		console.log("######### calling burnDVD from event handler ######"+finishedOp);
		burnDVD( data );
	} else if ( finishedOp == 'BurnDVD' ) { 
		hashFiles(data, 'HashDVD' );	
	} else if ( finishedOp == 'HashDVD' ) { 
		verifyHash(data, 'VerifyMatch' );
	} else if ( finishedOp == 'VerifyMatch' ) { 

		var outfileName = moment().format('YYYYMMDD_HHmm');	
		var sourceName = data.selectedEvidence.replace(/^\w+_/,''); 
		outfileName = outfileName + '_FileHash_'+sourceName+'.txt';
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

		socket.emit('processingComplete', {'outfileName': outfileName} );
	} 
} ;
//END eventEmitter.on e4aProcess


var verifyHash = function(data, theOperation) {
		data.hashVerified = 0;
		if(firstHashArr && secondHashArr ) {
			firstHashArr.forEach( function( fHash, fName) {
				if( ! secondHashArr[fName] || secondHashArr[fName] != fHash) {
					data.hashVerified = -1;
				}
			} );
			secondHashArr.forEach( function( fHash, fName) {
				if( ! firstHashArr[fName] || firstHashArr[fName] != fHash) {
					data.hashVerified = -2;
				}
			} );
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

//		eventEmitter.emit('e4aProcess', data , 'VerifyMatch' );
		e4aProcess(data, 'VerifyMatch');
}





});
// END SOCKET.IO WRAPPER




