var ordithomas = '192.168.2.7';
var userdumac = 'thomas';

var exec = require('child_process').exec;

var osc = require('osc-min'), dgram = require('dgram'), remote;
var fs = require('fs');
var http = require('http');
var udp = dgram.createSocket('udp4', function(msg, rinfo) {
  // save the remote address
  remote = rinfo.address;
  //console.log( rinfo.address );
  try {
    console.log(osc.fromBuffer(msg));
  } catch (err) {
    console.log('Could not decode OSC message');
  }
});
var ip = require("ip");
var i2c = require('i2c-bus');
var MPU6050 = require('i2c-mpu6050');
var address = 0x68;
var i2c1 = i2c.openSync(1);
var sensor = new MPU6050(i2c1, address);

var mpg = require('mpg123');
var player = new mpg.MpgPlayer();

var isinit = false;
var isplaying = false;
var loop = true;
var volume = 80;
var mode = 1; // mode par défaut = 1
var audiopath = '/home/pi/Music/';

var basculeLock = 1;

//var playlist = [ 'audio', 'cttresbien', 'deep-solar-wind', 'groove', 'minuteur', 'SuavementeBoleros', '44100-stereo2', '44100-stereo' ];
var playlist = ['minuteur'];

var currentsong = 0;

// calibration ?
/*var cal = sensor.readSync();
var calibrate = sensor.calibrateGyro(cal);
var calibrate = sensor.calibrateAccel(cal);*/
//console.log( sensor.calibration.gyro );

setInterval(function () { 
	var data = sensor.readSync();
	var roll = parseInt( ( Math.atan2( data.rotation.y, data.rotation.x ) * 360 / Math.PI ) );
	//var pitch = parseInt(Math.atan2( data.rotation.x, Math.sqrt( data.rotation.y * data.rotation.y + data.rotation.z * data.rotation.z )) * 180/Math.PI) - 45;
	//console.log( "roll : " + Math.abs( roll ) + ", pitch : " + Math.abs( pitch ) );
	//console.log( "roll : " + Math.abs( roll ) );
	var pd = parseInt( data.rotation.x );
	
	//console.log( pd );
	
	if( basculeLock ){
		if ( pd < 50 ){ // cube up
		//if ( Math.abs( roll ) > 20 || Math.abs( pitch ) > 20 ){ // cube up
			if( !isplaying ){
				isplaying = true;
				console.log( "playing : " + currentsong + "/" + parseInt( playlist.length - 1 ) + " => " + playlist[ currentsong ] );
				if( mode == 3 ){ // mode 3 on envoie l'index aux autres
					sendNext();
				}
				player.play( audiopath + playlist[ currentsong ] + ".mp3" );
			} 
		} else { // cube bougé
			if( isplaying ){
				isplaying=false;
				player.stop();
				
				
				if( mode == 1 ){ // mode 1 on repete le meme morceau
					
				} else if( mode == 2 ){ // mode 2 on joue le morceau suivant
				
					if( currentsong < playlist.length-1 ){
						currentsong++;
					} else {
						currentsong = 0;
					}
					
				} else if( mode == 3 ){ // mode 3 on envoie l'index aux autres
					//sendNext();
				}
				 
			}
		}
	}
}, 100);

function init(){
	player.volume(volume);
	player.play( audiopath + 'blip.mp3' );
	
	player.on('error', function(error){
		console.log("erreur: "+error);
	})
	
	player.on('format', function(){
		if( isinit ){
			//console.log( player.track + " loaded" );
		} else {
			console.log('init ...');
		}
	})
	
	player.on('end', function(data){
		if( !isinit ){
			isinit = true;
			console.log( "Ready" );
		} else {
			//console.log( "track end" );
			if( loop ){
				//player.play( audiopath + playlist[ currentsong ] + ".mp3" );
				//isplaying = false;
			}
		}
	})	


	// listen for OSC messages and print them to the console
	var udp = dgram.createSocket('udp4', function(msg, rinfo) {
	  // save the remote address
	  remote = rinfo.address;
	 
	  try {
		var pd = osc.fromBuffer(msg);
		console.log( "---------------------------------" );
		//console.log( "address: " +  pd.address + ", value: " + pd.args[0].value );
		if( pd.address == "/getNextTrack" ){
				sendNext();
		} else if( pd.address == "/setmode"  ){ // setmode <mode> <index>
			mode = pd.args[0].value;
			/*if( pd.args[1].value ){
				currentsong = pd.args[1].value;
			}*/
			console.log("switch to mode " + mode);
			
		} else if( pd.address == "/setPlaylist"  ){ // setmode <mode> <index>
			//console.log(pd);
			playlist=[];
			var lulu;
			pd.args.forEach(function(entry) {
					if( lulu ){
						lulu = lulu + ', ' + entry.value;
					} else {
						lulu = entry.value;
					}
					//console.log(entry.value);
					playlist.push( entry.value );
			});
			console.log( lulu );
			console.log( 'Playlist: OK' );
			console.log( 'Playlist index:' + currentsong + ', playlist length: ' + playlist.length );
			
		} else if( pd.address == "/setCommonPlaylist"  ){
			
			
		} else if( pd.address == "/playIndex"  ){ // play <index>
			console.log( 'Playindex:' + pd.args[0].value );
			playIndex( pd.args[0].value );
		} else if( pd.address == "/exit"  ){ // exit
			console.log( 'exit' );
            process.exit(0);
            //shell.exec('sudo shutdown -h now');
		} else if( pd.address == "/playTrack"  ){ // play <filename>
			playTrack( pd.args[0].value );
		} else if( pd.address == "/playNext"  ){ // 
			playNext();
		} else if( pd.address == "/playCurrent"  ){ //
			console.log( 'Play current:' + currentsong );
			playCurrent();
		} else if( pd.address == "/stopPlaying"  ){ // 
			console.log( 'Stop playing:' + currentsong );
			stopPlaying();
		} else if( pd.address == "/setVolume"  ){ // 
			setVolume( pd.args[0].value );
		} else if( pd.address == "/setCurrent"  ){ //
			console.log( 'Set current:' + pd.args[0].value );
			setCurrent( pd.args[0].value );
		} else if( pd.address == "/mode3Next"  ){ // 
			mode3Next( pd.args[0].value );
		} else if( pd.address == "/basculeLock"  ){ //
			console.log( 'Lock bascule:' + basculeLock );
			basculeLock = 0;
		} else if( pd.address == "/basculeUnlock"  ){ // 
			console.log( 'Unlock bascule:' + basculeLock );
			basculeLock = 1;
		} else if( pd.address == "/updateTracks"  ){ // syntaxe: /updateTracks 
			console.log( 'Mise à jour des fichiers son' );

			var urlList = [];
			pd.args.forEach(function( entry ) {
				urlList.push( entry.value );
			})
			
			var download = function( url, dest ){
				var request = http.get( url, function( response ) {
					
					if ( response.statusCode === 200 ) {
						var file = fs.createWriteStream( './Music/' + dest );
						response.pipe(file);
					}
					
					response.on('end', function () {
						console.log( 'Finished Downloading ./Music/' + dest );
					});
					
					request.setTimeout(12000, function () {
						request.abort();
					});
				});
			};
			urlList.forEach( function(str) {
				var filename =  str.split('/').pop();
				console.log('Downloading ./Music/' + filename);
				
				download( str, filename );
			});

		} else if( pd.address == "/autoUpdateTracks"  ){ // syntaxe: /autoUpdateTracks 
			console.log( 'Mise à jour automatique des fichiers son' );
			var urlList = [];

			var url = 'http://' + ordithomas + '/~' + userdumac + '/block/update/';
			
			var download = function( url, dest ){
				var request = http.get( url, function( response ) {
					
					if ( response.statusCode === 200 ) {
						var file = fs.createWriteStream( './Music/' + dest );
						response.pipe(file);
					}
					
					response.on('end', function () {
						console.log( 'Finished Downloading ./Music/' + dest );
					});
					
					request.setTimeout(12000, function () {
						request.abort();
					});
				});
			};
			
			http.get(url, function(res){
				var body = '';
				res.on('data', function(chunk){
					body += chunk;
				});
			
				res.on('end', function(){
					var fbResponse = JSON.parse(body);
					fbResponse.forEach( function( str ) {
						//console.log( str );
						download( url + str, str );
					});
					console.log( 'Fini auto update' );
				});
			}).on('error', function(e){
				  console.log("Got an error: ", e);
			});


		} else if( pd.address == "/reboot"  ){
			console.log( 'rebooting' );
			exec('sh /usr/local/bin/reboot.sh', function(error, stdout, stderr) {
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr);
				if (error !== null) {
					console.log('exec error: ' + error);
				}
			});
		} else if( pd.address == "/shutdown"  ){
			console.log( 'shuting down' );
			exec('sh /usr/local/bin/shutdown.sh', function(error, stdout, stderr) {
				console.log('stdout: ' + stdout);
				console.log('stderr: ' + stderr);
				if (error !== null) {
					console.log('exec error: ' + error);
				}
			});
		}
		
	  } catch (err) {
		console.log('Could not decode OSC message' + err);
	  }
	
	});


	
	udp.bind(9998);
	console.log('Listening for OSC messages on port 9998');
}
function mode3Next(current) {
	if( mode == 3 ){
		if( currentsong < playlist.length-1 ){ // si on est dans la liste
			currentsong = parseInt( current+1 );
			console.log("set playlist index to: " + currentsong );
		} else {
			currentsong = 0;
		}
	}
}
function setCurrent(current) {
	currentsong = current;
}
function setVolume(volume) {
	player.volume(volume);
}

function stopPlaying() {
	player.stop();
}
function playCurrent() {
	if( !isplaying ){
		player.play( audiopath + playlist[ currentsong ] + ".mp3" );
	} else {
		player.stop();
		player.play( audiopath + playlist[ currentsong ] + ".mp3" );
	}
	
}
function playNext() {
	if( currentsong < playlist.length-1 ){
		currentsong++;
	} else {
		currentsong = 0;
	}
	if( !isplaying ){
		player.play( audiopath + playlist[ currentsong ] + ".mp3" );
	} else {
		player.stop();
		player.play( audiopath + playlist[ currentsong ] + ".mp3" );
	}
	
}
function playIndex( index ) {
	if( !isplaying ){
		player.play( audiopath + playlist[ index ] + ".mp3" );
	} else {
		player.stop();
		player.play( audiopath + playlist[ index ] + ".mp3" );
	}
	
}
function playTrack( filename ) {
	console.log(filename);
	if( !isplaying ){
		player.play( audiopath + filename + ".mp3" );
	} else {
		player.stop();
		player.play( audiopath + filename + ".mp3" );
	}
	
}

// callback
function sendNext() {

  if(! remote)
    return;

 // console.log('remote: ' + remote);
	
  // build message with a few different OSC args
  var many = osc.toBuffer({
    oscType: 'message',
    address: '/nextTrack',
    args: [{
      type: 'string',
      value: playlist[ parseInt( currentsong ) ]
    },
    {
      type: 'integer',
      value: parseInt( currentsong )
    },
    {
      type: 'string',
      value: ip.address()
    }]
  });

  udp.send(many, 0, many.length, 9999, remote);
  console.log('Sent OSC message to %s:%d', remote, 9999);

}





init();