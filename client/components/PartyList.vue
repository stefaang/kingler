<template>
  <div class="party-list">
    <party-list-item v-for="party in parties" :party="party" @join="handleJoin" />
    <party-create @create="handleCreate" />
  </div>
</template>

<script>
import PartyCreate from './PartyCreate.vue'
import PartyListItem from './PartyListItem.vue'

export default {
  name: 'page-home',
  computed: {
    parties () {
      return this.$state.parties.list
    }
  },
  methods: {
    handleJoin (party) {
      console.log('This party was joined:', party)
      this.route.page = 'map'
    },
    handleCreate (party) {
      console.log('This party was created:', party)
      this.route.page = 'map'
    }
  },
  components: {
    PartyCreate,
    PartyListItem
  }
}
</script>

<style>
.party-list {
  width: 20em;
}
</style>
