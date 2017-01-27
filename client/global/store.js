import { state as bombs } from '../game/bombs'
import { state as parties } from '../game/parties'
import { state as players } from '../game/players'
import { state as io } from '../game/io'
import { state as user } from '../game/user'

const $state = {
  bombs,
  parties,
  players,
  io,
  user
}

function plugin(Vue) {
  Object.defineProperty(Vue.prototype, '$state', {
    get() {
     return $state;
    }
  })
}

export default plugin
