var osc = require('osc-min'), dgram = require('dgram'), remote;

// listen for OSC messages and print them to the console
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
var volume = 20;
var mode = 1; // mode par défaut = 1
var audiopath = '/home/pi/Music/';

//var playlist = [ 'audio', 'cttresbien', 'deep-solar-wind', 'groove', 'minuteur', 'SuavementeBoleros', '44100-stereo2', '44100-stereo' ];
var playlist = [];

var currentsong = 0;

// calibration ?
/*var cal = sensor.readSync();
var calibrate = sensor.calibrateGyro(cal);
var calibrate = sensor.calibrateAccel(cal);*/

setInterval(function () { 
	var data = sensor.readSync();
	var roll = parseInt(Math.atan2( data.rotation.y, data.rotation.z ) * 180/Math.PI);
	var pitch = parseInt(Math.atan2( data.rotation.x, Math.sqrt( data.rotation.y * data.rotation.y + data.rotation.z * data.rotation.z )) * 180/Math.PI);
	//console.log( "roll : " + roll + ", pitch : " + pitch );

	if ( pitch > -30 ){ // cube up
		if( !isplaying ){
			isplaying = true;
			console.log( "playing : " + currentsong + "/" + parseInt( playlist.length - 1 ) + " => " + playlist[ currentsong ] );
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
				sendNext();
			}
			 
		}
	}
}, 300);

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
		//console.log( pd.args[0].value );
		//console.log( "address: " +  pd.address + ", value: " + pd.args[0].value );
		if( pd.address == "/getNextTrack" ){
				sendNext();
		} else if( pd.address == "/setmode"  ){ // setmode <mode> <index>
			mode = pd.args[0].value;
			currentsong = pd.args[1].value;
			console.log("switch to mode " + mode);
		} else if( pd.address == "/setPlaylist"  ){ // setmode <mode> <index>
			//console.log(pd);
			playlist=[];
			pd.args.forEach(function(entry) {
					console.log(entry.value);
					playlist.push(entry.value);
			});
			
			//playlist = pd.args[0].value;
			//currentsong = pd.args[1].value;
			//console.log("switch to mode " + mode);
			console.log('Playlist: OK');
			
		} else if( pd.address == "/setCommonPlaylist"  ){
			//console.log(pd);
			/*playlist=[];
			pd.args.forEach(function(entry) {
					console.log(entry.value);
					playlist.push(entry.value);
			});*/
			
			
		} else if( pd.address == "/playIndex"  ){ // play <index>
			playIndex( pd.args[0].value );
		} else if( pd.address == "/playTrack"  ){ // play <filename>
			playTrack( pd.args[0].value );
		} else if( pd.address == "/playNext"  ){ // 
			playNext();
		} else if( pd.address == "/playCurrent"  ){ //
			playCurrent();
		} else if( pd.address == "/stopPlaying"  ){ // 
			stopPlaying();
		} else if( pd.address == "/setVolume"  ){ // 
			setVolume( pd.args[0].value );
		} else if( pd.address == "/setCurrent"  ){ // 
			setCurrent( pd.args[0].value );
		} else if( pd.address == "/mode3Next"  ){ // 
			mode3Next( pd.args[0].value );
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
		
		currentsong = parseInt( current+1 );
		console.log("set playlist index to: " + currentsong );
	}//sendNext();
}
function setCurrent(current) {
	currentsong = current;
	//sendNext();
}
function setVolume(volume) {
	player.volume(volume);
}

function stopPlaying() {
	//if( isplaying ){
		player.stop();
	//}
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
  // we don't have the remote address yet
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