var socket

export function init() {
  // Start connecting 
  socket = window.io();
  socket.on('connect', function() {
    socket.emit('derp event', { data: 'i am connecting hell yeah' });
    console.log("Websockets ready - connected");
  });
}
