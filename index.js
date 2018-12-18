var fs = require('fs');
var http = require('http');
var https = require('https');
var express = require('express');
var app = express();
var cookieParser = require('socket.io-cookie-parser');
var port = 443;

var options = { key: fs.readFileSync('ssl/privkey.pem'), cert: fs.readFileSync('ssl/cert.pem'), };
  
 
http.createServer(function (req, res) {
	res.writeHead(301,{Location: 'https://'+ req.headers.host + req.url});
	res.end();	
}).listen(80); 

var server = https.createServer(options, app).listen(port, function(){});
app.use('/', express.static('public'));
var io = require('socket.io').listen(server);
io.use(cookieParser()); 