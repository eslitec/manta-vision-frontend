<template lang="pug">
component.outline-btn(:is="tag" :class="`outline-btn--${variant}`")
  slot
</template>

<script setup lang="ts">
withDefaults(defineProps<{ tag?: string; variant?: 'default' | 'danger' }>(), { tag: 'button', variant: 'default' })
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
    background: #14193f;
    transform: translateY(1px);
  }
  &--danger {
    border-color: #ff6148;
    color: #ff6148;
    border-radius: 16px;
    &:focus,
    &:hover,
    &:disabled {
      border-color: #ff6148;
    }
    &:active {
      background: $white;
    }
  }
}
</style>
