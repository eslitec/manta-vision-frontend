<template lang="pug">
span.statusDot(:class="`statusDot--${tone}`" aria-hidden="true")
</template>

<script setup lang="ts">
export type StatusDotTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'info'

withDefaults(defineProps<{ tone?: StatusDotTone }>(), { tone: 'neutral' })
</script>

<style scoped lang="scss">
.statusDot {
  width: 0.5rem;
  height: 0.5rem;
  flex: 0 0 0.5rem;
  border-radius: 50%;
  background: $gray-100;

  &--success {
    background: #36c759;
  }
  &--warning {
    background: $yellow;
  }
  &--danger {
    background: $red;
  }
  &--brand {
    background: $blue-dark-500;
  }
  &--info {
    background: $babyBlue;
  }
}
</style>
