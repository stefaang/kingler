<template>
  <div class="party-list__item" @click="handleJoin">
    <div class="party__label">{{ party.label }}</div>
    <div class="party__players">{{ party.players.length }}</div>
    <div class="party__action">
      <button type="button">Join</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'party-list-item',
  props: ['party'],
  methods: {
    handleJoin () {
      console.log('This party was joined', this.party)
      this.$emit('join', this.party)
    }
  }
}
</script>

<style>
.party-list__item {
  display: flex;
  border-radius: 5px;
  padding: .5em;
  align-items: center;
  width: 100%;
  min-height: 3em;
  cursor: pointer;

  + .party-list__item {
    border-top: 1px solid rgba(255, 255, 255, .1);
  }

  &:hover {
    border-top-color: transparent;
    background:  rgba(255, 255, 255, .1);
    + .party-list__item {
      border-top-color: transparent;
    }
  }
}
.party__label {
  flex: 1;
  display: flex;
}
.party__players {
  flex: 0 0 3em;
}
.party__action {
  button {
    border: none;
    background: none;
    color: inherit;
  }
}
</style>
