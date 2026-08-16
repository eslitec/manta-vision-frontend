<template lang="pug">
button.appTab(type="button" role="tab" :aria-selected="active" :class="{ 'isActive': active }")
  slot
</template>

<script setup lang="ts">
withDefaults(defineProps<{ active?: boolean }>(), { active: false })
</script>

<style scoped lang="scss">
.appTab {
  padding: 0 0.25rem 0.5rem;
  border-bottom: 2px solid transparent;
  color: $gray-100;
  font-size: 0.875rem;
  font-weight: 400;

  &.isActive {
    border-bottom-color: $orange;
    color: $dark-blue-gray;
    font-weight: 500;
  }

  &:focus-visible {
    outline: 2px solid $yellow;
    outline-offset: 2px;
  }
}
</style>
