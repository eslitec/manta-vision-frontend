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
    opacity: 0.3;
    pointer-events: none;
    box-shadow: none;
  }
  /* pressed/active style: translate and remove shadow for a pressed effect */
  &:active {
    border-color: #14193f;
    transform: translateY(1px);
  }
  &--danger {
    border-color: #ff6148;
    color: #ff6148;
    border-radius: 16px;
    &:focus {
      border-color: #ff6148;
      box-shadow:
        $btnBoxShadow,
        0 0 0 3px #f2bb00;
    }

    &:hover {
      color: #ff8a78;
      border-color: #ff8a78;
    }
    &:disabled {
      cursor: not-allowed;
      opacity: 0.3;
      pointer-events: none;
      box-shadow: none;
    }
    &:active {
      background: #d93e28;
    }
  }
}
</style>
