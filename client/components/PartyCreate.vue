<template>
  <div class="party-list__item party-create">
    <div class="party__label"><input type="text" v-model="party.label" placeholder="Name your party"></div>
    <div class="party__players">
      <select v-model="party.minPlayers">
        <option v-for="num in 20">{{ num }}</option>
      </select>
    </div>
    <div class="party__action">
      <button type="button" @click="handleCreate">Create</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'page-home',
  data () {
    return {
      party: {
        label: '',
        minPlayers: 1
      }
    }
  },
  computed: {
    parties () {
      return this.$state.parties.list
    }
  },
  methods: {
    handleCreate (party) {
      console.log('This party was create:', party)
      this.$emit('create', party)
    }
  }
}
</script>

<style>
.party-create {
  width: 20em;
}
</style>
