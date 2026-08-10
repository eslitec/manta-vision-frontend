<template lang="pug">
button.dialogBtn(:class="`dialogBtn--${variant}`")
  slot
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'plain' | 'primary' | 'danger' }>(), { variant: 'plain' })
</script>

<style scoped lang="scss">
.dialogBtn {
  @include flex(center, center, 0.375rem);
  border-radius: 18px;
  padding: 0.5625rem 1rem;
  font-size: 0.875rem;
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
