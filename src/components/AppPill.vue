<template lang="pug">
span.appPill(:class="`appPill--${tone}`")
  slot
</template>

<script setup lang="ts">
export type AppPillTone = 'neutral' | 'success' | 'warning' | 'danger' | 'tag' | 'solid'

withDefaults(defineProps<{ tone?: AppPillTone }>(), { tone: 'neutral' })
</script>

<style scoped lang="scss">
.appPill {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0.1875rem 0.75rem;
  border: 1px solid $gray;
  border-radius: 16px;
  background: $white;
  color: #606692;
  font-size: 0.8125rem;
  line-height: 0.875rem;
  white-space: nowrap;

  &--success {
    border-color: #36c759;
    color: #258c40;
  }
  &--warning {
    border-color: $yellow;
    color: #8a6800;
  }
  &--danger {
    border-color: $red;
    color: $red;
  }
  &--tag {
    border-color: transparent;
    background: #f6eac1;
    color: $dark-blue-gray;
  }
  &--solid {
    border-color: $blue-dark-500;
    background: $blue-dark-500;
    color: $white;
  }
}
</style>
