

//var server = require("./server");
//var router = require("./router");
//server.start(router.route);


var Connect = require('connect');

var app = Connect() //.createServer(
	.use(Connect.static("../E4A") )
	.listen(8888);
//  Connect.logger(), // Log responses to the terminal using Common Log Format.
//  Connect.responseTime(), // Add a special header with timing information.
//  Connect.conditionalGet(), // Add HTTP 304 responses to save even more bandwidth.
//  Connect.cache(), // Add a short-term ram-cache to improve performance.
//  Connect.gzip(), // Gzip the output stream when the browser wants it.
//  Connect.staticProvider("../E4A") // Serve all static files in the current dir.
//);




