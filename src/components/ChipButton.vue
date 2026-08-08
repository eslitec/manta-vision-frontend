<template lang="pug">
button.chip-btn(:class="`chip-btn--${variant}`")
  slot
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'dark' | 'plain' }>(), { variant: 'dark' })
</script>

<style scoped lang="scss">
.chip-btn {
  @include flex(center, center, 6px);
  padding: 9px 16px;
  border-radius: 18px;
  font-size: 14px;
  box-shadow: $btnBoxShadow;
  &--dark {
    background: $blue-dark-500;
    color: $white;
    font-weight: 500;
  }
  &--plain {
    background: $blue-light;
    color: $blue-dark-500;
  }
}
</style>
