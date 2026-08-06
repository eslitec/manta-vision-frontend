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
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  &--dark {
    background: $blue-dark-300;
    color: $white;
    font-weight: 600;
  }
  &--plain {
    background: $blue-light;
    color: $blue-dark-300;
  }
}
</style>
