<template lang="pug">
component.outlineBtn(:is="tag" :class="`outlineBtn--${variant}`")
  slot
</template>

<script setup lang="ts">
withDefaults(defineProps<{ tag?: string; variant?: 'default' | 'danger' }>(), { tag: 'button', variant: 'default' })
</script>

<style scoped lang="scss">
.outlineBtn {
  @include flex(center, center, 0.375rem);
  padding: 0.5625rem 1rem;
  border: 1px solid $blue-dark-500;
  border-radius: 18px;
  background: $white;
  color: $blue-dark-500;
  font-size: 0.875rem;
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
    transform: translateY(0.0625rem);
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
