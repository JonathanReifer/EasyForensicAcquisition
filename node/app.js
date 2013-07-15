

var express = require('express')
    , app = module.exports = express();
var http = require('http'),
		server = http.createServer(app);
var io = require('socket.io').listen(server);

var fs = require('fs');
 
// Using the .html extension instead of
// having to name the views as *.ejs
app.engine('.html', require('ejs').__express);
 
// Set the folder where the pages are kept
app.set('views', __dirname + '/views');
 
// This avoids having to provide the 
// extension to res.render()
app.set('view engine', 'html');
 
var messages = [
  { name: 'Nathan Explosion', message: 'Dethklok rules' },
  { name: 'William Murderface', message: 'Bass is the heart of the band' },
  { name: 'Dr. Rockso', message: 'Where is my friend Toki?' }
];

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
	evidenceMediaList.every( function(u, i) {
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
			socket.emit('evidenceMediaList',   evidenceMediaList );

	}

	

}, 5000);


//  socket.emit('news', { hello: 'world' });
//  socket.on('my other event', function (data) {
//    console.log(data);
//  });
});






