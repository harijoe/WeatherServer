/**
 * Created by julienvallini on 13/01/16.
 */
console.log('imported');
var socket = io('http://vallini.io:3000 ');
socket.on('arduino_emitting', function (data) {
  console.log(data);
});