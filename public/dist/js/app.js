var dat = {};
var socket = io.connect('https://demo.eurohost.pro',{secure: true});

function run(act) {
	$('body :input ').each(function(e){	
		if (this.checked){
			dat[this.id] = $(this).is(':checked');
		}else{
			dat[this.id] = this.value;
		} 
	});
	socket.emit(act, JSON.stringify(dat));	
	console.log(dat);
}	

socket.on('message', function(data){
	console.log(data);
}); 

socket.on('connect', function() {
	// console.log('CONNECTED');
});	  	

socket.on('disconnect', function() {
	// console.log('DISCONECTED');
});		

socket.on('cookie', function(cookie) {
	document.cookie = cookie;
	console.log(cookie);
});		

socket.on('msg', function(msg) {
	// console.log(msg);
	$('#msghead').html(msg[0]);
	$('#msgbody').html(msg[1]);
	$('#msghead').css('color', msg[2]);
	$("#msg").modal();
});	

socket.on('html', function(msg) {
	$('#'+msg[0] ).html(msg[1]);
});	

socket.on('alert', function(msg) {
	switch(msg[2]) {
		case 'success':	
			toastr.success(msg[1], msg[0]);
		break;
		case 'info':	
			toastr.info(msg[1], msg[0]);
		break;	
		case 'warning':	
			toastr.warning(msg[1], msg[0]);
		break;
		case 'error':	
			toastr.error(msg[1], msg[0]);
		break;		
		default:
			toastr.success(msg[1], msg[0]);
	} 
});

socket.on('loginmsg', function(msg) {
	//console.log(msg[0]);
	$('#loginform').animate( {'background-color': msg[1] } , 300);
	// $('#loginmsg').css('color', msg[1]);
	$('#loginmsg').css('text-shadow', '5px 5px 20px ' + msg[1]);
	$('#loginmsg').html(msg[0]).show().delay(1500).fadeOut();
	
	setTimeout(function () {
		$('#loginform').animate( {'background-color': 'transparent' } , 300);
    }, 300);
});	

socket.on('java', function(msg) {
	$.globalEval(msg);
});	

$('a').click(function(event) {
    event.preventDefault();
});


$(document).keydown(function(e) {
	if(e.keyCode == 27 ) {
		$(e.target).val('');
	}		
});

$(function() {
	//console.log(document.cookie);
});