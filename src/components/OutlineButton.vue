<template lang="pug">
component.outline-btn(:is="tag")
  slot
</template>

<script setup lang="ts">
withDefaults(defineProps<{ tag?: string }>(), { tag: 'button' })
</script>

<style scoped lang="scss">
.outline-btn {
  @include flex(center, center, 6px);
  padding: 9px 16px;
  border: 1px solid $blue-dark-300;
  border-radius: 18px;
  background: $white;
  color: $blue-dark-300;
  font-size: 14px;
  white-space: nowrap;
  box-shadow: $btnBoxShadow;
  cursor: pointer;
  &:focus {
    border-color: $blue-dark-500;
  }
  &:hover {
    border-color: #606692;
  }
  &:disabled {
    border-color: $blue-dark-500;
    cursor: not-allowed;
  }
  /* pressed/active style: translate and remove shadow for a pressed effect */
  &:active {
    border-color: #14193f;
    transform: translateY(1px);
  }
}
</style>
