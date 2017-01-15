var socket;

export function init() {
  // Setup socketIO connection
  socket = window.io();
  socket.on('connect', function() {
    socket.emit('vue derp event', { data: 'i am connecting hell yeah' });
    console.log("Websockets ready - connected");
  });
}
