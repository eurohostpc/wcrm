var fs = require('fs'),
    http = require('http'),
    https = require('https'),
    express = require('express'), 
	app = express(),
	mysql = require('mysql'),
	cookieParser = require('socket.io-cookie-parser'),
	port = 443;
var users = [];
 
var options = { key: fs.readFileSync('ssl/privkey1.pem'), cert: fs.readFileSync('ssl/cert1.pem'), };
var mysqlconfig = { host: 'localhost', user: 'root', password: '', database: 'wcrm', connectionLimit: 500 }
var pool = mysql.createPool(mysqlconfig);
var builder = require('./builder.js');

function socketretry(){
	users.forEach(function(item, index) {
		if ( item.user_retry ) {
			users[index].user_retry -= 1 ;
		} 
    });	
	// console.log(users);
}
setInterval(socketretry, 1000);

function checksocket(socket, searchuser, action , callback){
	var user = parseCookies(socket.request).user;
	var found = false; 
	
	users.forEach(function(item, index) {
		

				
		if ( item.user_token == user || item.user_user == searchuser ) {
			users[index].user_retry += 1 ;	
			
			found = true;
			
			if(item.user_retry > 5){
				console.log({TYPE: 'RELAX ERROR', USER : item.user_user , SOCKET: socket.id, IP : socket.handshake.address });
				io.to(socket.id).emit('msg', [ 'NEW MESSAGE','RELAX','#ff0000'] );
			}			
			
			if ( action == 'logout' ) {
				users.splice(index, 1);
				io.to(item.user_session).emit('java', 'window.location.href = "/login.html";' );
			} 
			
			if ( action == 'connect' ) {
				users[index].user_session = socket.id;
				callback(item);
			}
			
			if ( action == 'login' ) {	
				users.splice(index, 1);
				io.to(item.user_session).emit('java', 'window.location.href = "/login.html";' );
				callback(item);
			}
		} 
    });
	if( found == false ){ callback(false);}
}

function runquery(sql, filter, socket, reply ) {
	pool.query(sql,filter, function (error, results, fields) {
		if (error){ 
			console.log({TYPE: 'QUERY ERROR', SOCKET: socket.id, IP : socket.handshake.address , SQL: sql, MESSAGE : error.sqlMessage });
		} else {
			reply({results: results, fields :fields, socket: socket });
		}
		// console.log({TYPE: 'QUERY', SOCKET: socket.id, IP : socket.handshake.address , SQL: sql, FILTER :filter ,RESULTS : results });
	});
	
}


function checklogin (data, socket, login = false) {	
	
	runquery("  select * from sys_users where user_user = ? and user_pass = ?  ", [data.user,data.pass], socket ,function(reply){
		if(reply.results.length > 0){
			var thisuser = JSON.parse(JSON.stringify(reply.results))[0];
			checksocket(socket,thisuser.user_user , 'login' , function(user){});
			thisuser.user_token = socket.id
			users.push(thisuser);
			io.to(socket.id).emit('cookie', 'user=' + socket.id );
			io.to(socket.id).emit('loginmsg', ['','#80ff00',1000] );
			io.to(socket.id).emit('java', 'window.location.href = "/";' );
			
		} else {
			io.to(socket.id).emit('loginmsg', ['','#ff4000',1000] );
			console.log({TYPE: 'LOGIN ERROR ', SOCKET: socket.id, IP : socket.handshake.address , DATA: data });
		}
	});
	

}

http.createServer(function (req, res) {
	res.writeHead(301,{Location: 'https://'+ req.headers.host + req.url});
	res.end();	
}).listen(80);

var server = https.createServer(options, app).listen(port, function(){});
app.use('/', express.static('html'));
var io = require('socket.io').listen(server);
io.use(cookieParser());

function parseCookies(request) {
    var list = {}, rc = request.headers.cookie;
    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return list;
}

io.sockets.on('connection',function (socket) {
	
	checksocket(socket,null , 'connect', function(user){
		if(typeof user.user_token !== 'undefined' ){ 
			console.log('FOUND : ' + user.user_token + ' IP : ' + socket.handshake.address ); 
			if(socket.request.headers.referer.indexOf('login') > -1) {
				io.to(socket.id).emit('java', 'window.location.href = "/";' );
			}			
		} else {
			console.log('NOT FOUND : ' + socket.id + ' IP : ' + socket.handshake.address );
			if(socket.request.headers.referer.indexOf('login') == -1) {
				io.to(socket.id).emit('java', 'window.location.href = "/login.html";' );
			}
		}
	});	
	
	socket.on('login', function (message) {
		checklogin(JSON.parse(message),socket, true);
	});

	socket.on('recover', function (message) {
		console.log(users);
		// runquery(" select * from tln_rdv limit 10 ", null, socket ,function(reply){
			// io.to(socket.id).emit('message', reply.results );
		// });
	});

	socket.on('test', function() {
		io.to(socket.id).emit('alert', [ 'SYSTEM','SAVED','info'] );
		// checksocket(socket,null , false , function(user){});
		// console.log(users);		
		// console.log({TYPE: 'LOGOUT ', SOCKET: socket.id, IP : socket.handshake.address });
	});
	
	socket.on('logout', function() {
		checksocket(socket, null, 'logout' , function(user){});		
		// console.log({TYPE: 'LOGOUT ', SOCKET: socket.id, IP : socket.handshake.address });
	});	
	
	socket.on('disconnect', function() {
		// console.log({TYPE: 'DISCONECT ', SOCKET: socket.id, IP : socket.handshake.address });
	});	 

	socket.on('load', function() {
		checksocket(socket,null , 'connect', function(user){
			if( user.user_menu == null ){ io.to(socket.id).emit('msg', [ 'SYSTEM','NO MENU FOUND ON USER ACCOUNT ','#ff0000'] ); return; }
			runquery(" select * from sys_menu where menu_id in (?) or 'user' = ? order by menu_parent, menu_order ", [ user.user_menu.split(','), user.user_user ], socket ,function(reply){
				if(reply.results.length > 0){
					var menu = '';
					reply.results.forEach(function(item, index) {
						if(item.menu_parent == -1){
							menu += '<li class="sidebar-item"> <a class="sidebar-link has-arrow waves-effect waves-dark" href="#" aria-expanded="false"><i class="mdi mdi-' + item.menu_icon + '"></i><span class="hide-menu">' + item.menu_name + ' </span></a><ul aria-expanded="false" class="collapse  first-level">';
							reply.results.forEach(function(item2, index2) {
								if(item2.menu_parent == item.menu_id){
									menu += '<li onclick="run(\'' + item2.menu_action + '\');" class="sidebar-item"><a href="#" class="sidebar-link"><i class="mdi mdi-' + item2.menu_icon + '"></i><span class="hide-menu"> ' + item2.menu_name + ' </span></a></li>';
								}
							});
							menu += '</ul></li>';
						}
						if(item.menu_parent === 0){
							menu += '<li onclick="run(\'' + item.menu_action + '\');" class="sidebar-item"> <a class="sidebar-link waves-effect waves-dark" href="#" aria-expanded="false"><i class="mdi mdi-' + item.menu_icon + '"></i><span class="hide-menu">' + item.menu_name + ' </span></a><ul aria-expanded="false" class="collapse  first-level"></ul></li>';								
						}
					});
					io.to(socket.id).emit('html', [ 'sidebarnav',menu] );
					io.to(socket.id).emit('java', 'activatemenu();' );
				} else {
					io.to(socket.id).emit('msg', [ 'SYSTEM','NO MENU FOUND ON DB FOR THIS USER ','#ff0000'] );
				}
			});
			
		});	

	});
	
	socket.on('builder', function() {
		
		checksocket(socket,null , 'connect', function(user){
			if( user.user_user == null ){ io.to(socket.id).emit('msg', [ 'SYSTEM','NO LOGIN','#ff0000'] ); return; }

			var builder = require('./builder.js');
			builder.start(io, socket);

		});	

	});	
 	
	
});




   