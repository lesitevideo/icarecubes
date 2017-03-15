var mpg = require('mpg123');
var player = new mpg.MpgPlayer();

var i2c = require('i2c-bus');
var MPU6050 = require('i2c-mpu6050');
var play=false;

var address = 0x68;
var i2c1 = i2c.openSync(1);

var sensor = new MPU6050(i2c1, address);

var mode = 1; // mode par défaut = 1
var audiopath = './Music/';

var playlist = [ audiopath+'audio.mp3', audiopath+'cttresbien.mp3', audiopath+'deep-solar-wind.mp3', audiopath+'groove.mp3', audiopath+'minuteur.mp3', audiopath+'PagesRoses2.mp3', audiopath+'SuavementeBoleros.mp3', audiopath+'44100-stereo2.mp3', audiopath+'44100-stereo.mp3' ]
var currentsong = 0;

/*var m3u = './playliste.m3u';
player.loadlist( m3u, -1 );
console.log( m3u.length );*/

// calibration
/*var cal = sensor.readSync();
var calibrate = sensor.calibrateGyro(cal);
var calibrate = sensor.calibrateAccel(cal);*/

setInterval(function () { 
    var data = sensor.readSync();
	//console.log( data );
	var roll = parseInt(Math.atan2( data.rotation.y, data.rotation.z ) * 180/Math.PI);
	var pitch = parseInt(Math.atan2( data.rotation.x, Math.sqrt( data.rotation.y * data.rotation.y + data.rotation.z * data.rotation.z )) * 180/Math.PI);
	//console.log( "roll : " + roll + ", pitch : " + pitch );
	//if ( roll < -150 && pitch < -40 ){
	if ( roll > 110 || roll < 70 ){
		if( !play ){
			play=true;
			
			console.log( "playing : " + currentsong + "/" + parseInt( playlist.length - 1 ) + " => " + playlist[ currentsong ] );
			player.play( playlist[ currentsong ] );
			
			//player.loadlist( m3u, currentsong );
			//console.log( player.file );
			//player.on('format', function(){
				//console.log( player.track );
			//})
			
			player.on('error', function(data){
				console.log("erreur: "+data);
			})
			
			
		} 
	} else {
		if( play ){
			play=false;
			player.stop();
			if( currentsong < playlist.length-1 ){
				currentsong++;
			} else {
				currentsong = 0;
			}
			 
		}
	}
}, 500); 
console.log( "Ready" );
