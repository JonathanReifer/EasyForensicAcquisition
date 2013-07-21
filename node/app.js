

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

var metaData = []; 

// Serve the index page
app.get('/', function(req, res){
  res.render('index', {
    pageTitle: 'Easy Forensic Acquisition',
    evidenceMediaList: evidenceMediaList
  });
});

// Serve the selectEvidence page
app.get('/selectEvidence.html', function(req, res){

	if(fs.existsSync(evidenceMediaLookPath ) ) {
		evidenceMediaList = fs.readdirSync( evidenceMediaLookPath  );
	}
	evidenceMediaList.forEach( function(u, i) {
			console.log(u);
	} );
  res.render('selectEvidence', {
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
  	evidenceFileList = fs.readdirSync(evidenceMediaPath+'/'+data.selectedEvidence);
//		walk(evidenceMediaPath+'/'+data.selectedEvidence, function(err, evidenceFileList) {
//		  if (err) throw err;
//			exec('find', [ evidenceMediaPath+'/'+data.selectedEvidence ], function(err, stdout, stderr) {
//			console.log("TEST="+stdout);
//			evidenceFileList = stdout.split('\n');
			var outfileData = [];	
			var hashProcessStatus = [];

			metaData = [];
			metaData.push( '### EasyForensicAquisition Evidence Hash Report\n');
			metaData.push( '### Evidence Selected : '+data.selectedEvidence+'\n');
			metaData.push( '### Starting Hash Computation at '+moment().format('YYYY-MM-DD HH:mm:ss')+'.\n' ) ;	
	
			evidenceFileList.forEach( function( filename, index ) {
				console.log("Calculating Hash Digest for :"+filename);	
				hashProcessStatus[index] = 0;
				var shasum = crypto.createHash('sha256');
				var s = fs.ReadStream( evidenceMediaPath+'/'+data.selectedEvidence+'/'+filename);
//				var s = fs.ReadStream( filename );
				s.on('data', function(d) {
					shasum.update(d);
				});
				s.on('end', function() {
					var d = shasum.digest('hex');
					console.log(d + '  ' + filename);
					outfileData[index] =  d + '  ' + filename + "\n";
					hashProcessStatus[index] = 1;
					if(hashProcessStatus.length == evidenceFileList.length ) {
						var complete=1;
						hashProcessStatus.forEach( function(hashStatus) {
							if(hashStatus != 1 ) {
								complete=0;
								return;;
							}
						} );
						if(complete == 1) {
							fileHashingComplete(data.selectedDestination, outfileData, data.selectedEvidence, metaData); 
						}
					}
				});
			} );			
//		} ); 
  });

var fileHashingComplete = function(dest, outfileArr, evid, metaData) {

		var outfileData = '';
		metaData.push( '### Complete Hash Computation at '+moment().format('YYYY-MM-DD HH:mm:ss')+'.\n' ) ;	
		metaData.forEach( function(line,ind) {
			outfileData += line;
		} );
		outfileData += '#################### BEGIN FILE HASH LIST ####################\n';
		outfileArr.forEach( function(line,ind) {
			outfileData += line;
		} );
		outfileData += '####################  END FILE HASH LIST  ####################\n';
		var outfileName = moment().format('YYYYMMDD_HHmm');	
		outfileName = outfileName + '_FileHash_'+evid+'.txt';
		var outfileFull = writeableMediaPath+'/'+dest+'/'+outfileName;
		fs.writeFile(outfileFull, outfileData, function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log("FileHashReport successfully written!\nPath:"+outfileFull);
			}
		} );

		exec("sync");
		exec("scripts/unmountAll.sh");
		socket.emit('processingComplete', {'outfileName': outfileName} );
};

});


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




