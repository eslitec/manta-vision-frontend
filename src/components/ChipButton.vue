<template lang="pug">
button.chipBtn(:class="`chipBtn--${variant}`")
  slot
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'dark' | 'plain' }>(), { variant: 'dark' })
</script>

<style scoped lang="scss">
.chipBtn {
  @include flex(center, center, 0.375rem);
  padding: 0.5625rem 1rem;
  border-radius: 18px;
  font-size: 0.875rem;
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
