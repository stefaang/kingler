console.log('parti')
export const state = {
  list: []
}

export function setParties (data) {
  state.list = data || []
}

setTimeout(() => {
  setParties([{
    id: 1,
    label: 'some game',
    players: ['qsdf', 'stefaan', 'wut']
  }, {
    id: 2,
    label: 'some empty game',
    players: []
  }, {
    id: 3,
    label: 'some new game',
    players: ['a', 'b'],
    minPlayers: 5
  }])
})
