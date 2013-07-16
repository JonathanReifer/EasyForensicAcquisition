

var express = require('express')
    , app = module.exports = express();
var http = require('http'),
		server = http.createServer(app);
var io = require('socket.io').listen(server);

var fs = require('fs');
var crypto = require('crypto');
 
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

var evidenceMediaList = []; 
var writeableMediaList = []; 
evidenceMediaList = fs.readdirSync(evidenceMediaPath );
writeableMediaList = fs.readdirSync(writeableMediaPath );

 
// Serve the index page
app.get('/', function(req, res){
  res.render('index', {
    pageTitle: 'Easy Forensic Acquisition',
    evidenceMediaList: evidenceMediaList
  });
});

// Serve the selectEvidence page
app.get('/selectEvidence.html', function(req, res){
	evidenceMediaList = fs.readdirSync( evidenceMediaPath  );
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
	evidenceMediaList = fs.readdirSync(evidenceMediaPath);
	
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
	writeableMediaList = fs.readdirSync(writeableMediaPath);
	
	//NEED TO UPDATE LIST THAT IS SHOWN.
	if(oldWMList.length != writeableMediaList.length || 
			! oldWMList.every(function(u, i) {
				return u === writeableMediaList[i];
			} )  ) {
			console.log("writeableMediaList contents changed!");	
			console.dir(writeableMediaList);	
			socket.emit('writeableMediaList',   writeableMediaList );

	}

}, 5000);


	
  socket.on('beginProcessing', function (data) {
    console.dir(data);
  	evidenceFileList = fs.readdirSync(evidenceMediaPath+'/'+data.selectedEvidence);

		//TODO NEED TO READ RECURSIVELY INTO ALL DIR IN selectedEvidence.	

		var outfileData = '';	
		var hashProcessStatus = [];

		evidenceFileList.forEach( function( filename, index ) {
			console.log("Calculating Hash Digest for :"+filename);	
			hashProcessStatus[index] = 0;
			var shasum = crypto.createHash('sha256');
			var s = fs.ReadStream( evidenceMediaPath+'/'+data.selectedEvidence+'/'+filename);
			s.on('data', function(d) {
				shasum.update(d);
			});
			s.on('end', function() {
				var d = shasum.digest('hex');
				console.log(d + '  ' + filename);
				outfileData += d + '  ' + filename + "\n";
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
						fileHashingComplete(data.selectedDestination, outfileData); 
					}
				}
			});
		} );			
	
  });

var fileHashingComplete = function(dest, outfileData) {

		var outfileName = 'SomeOutFIleName.txt';	
		var outfileFull = writeableMediaPath+'/'+dest+'/'+outfileName;
		fs.writeFile(outfileFull, outfileData, function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log("FileHashReport successfully written!\nPath:"+outfileFull);
			}
		} );

		socket.emit('processingComplete', {'outfileName': outfileName} );
};

});






