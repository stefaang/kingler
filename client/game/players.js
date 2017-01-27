import { inert } from '../lib.js'
import { state as io } from './io.js'

export const state = {
  list: []
}

// Move a player randomly
export function moveRandom (p) {
  let lng = p.position.longitude, lat = p.position.latitude;
  p.position = {
    longitude: lng + Math.random() * 0.002 - 0.001,
    latitude:  lat + Math.random() * 0.002 - 0.001
  }
}

// Move all players randomly
export function moveRandomAll () {
  for (let id in state.list) {
    moveRandom(state.list[id]);
  }
}

// Some test stuff

setTimeout(function () {
  state.list.push({
    name: 'me',
    position: [3.7250, 51.05]
  })
}, 1000);
setTimeout(function () {
  state.list.push({
    name: 'you',
    position: [3.7250, 51.05]
  })
}, 2000);
setTimeout(function () {
  state.list.push({
    name: 'blub',
    position: [3.7250, 51.05]
  })
}, 3000);

setTimeout(function () {
  setInterval(moveRandomAll, 2000);
}, 10000);
