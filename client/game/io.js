export const state = {
  socket: null
}

export function init() {
  if (state.socket) {
    return console.warn('Tried to init io.socket twice')
  }

  // Setup socketIO connection
  state.socket = window.io()
  state.socket.on('connect', function() {
    state.socket.emit('vue derp event', { data: 'i am connecting hell yeah' });
    console.log("Websockets ready - connected");
  })
}
