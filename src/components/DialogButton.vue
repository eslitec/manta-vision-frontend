<template lang="pug">
button.dialog-btn(:class="`dialog-btn--${variant}`")
  slot
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'plain' | 'primary' | 'danger' }>(), { variant: 'plain' })
</script>

<style scoped lang="scss">
.dialog-btn {
  @include flex(center, center, 6px);
  border-radius: 18px;
  padding: 9px 16px;
  font-size: 14px;
  box-shadow: $btnBoxShadow;
  &--plain {
    border: 1px solid $blue-dark-500;
    color: $blue-dark-500;
    background: $white;
  }
  &--primary {
    border: none;
    background: $blue-dark-500;
    color: $white;
    font-weight: 500;
    &:disabled {
      opacity: 0.45;
    }
  }
  &--danger {
    border: none;
    background: $red;
    color: $white;
    font-weight: 600;
    &:disabled {
      opacity: 0.45;
    }
  }
}
</style>
