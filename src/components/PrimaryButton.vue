<template lang="pug">
button.primaryBtn
  slot
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.primaryBtn {
  @include flex(center, center, 0.375rem);
  background: $blue-dark-500;
  color: $white;
  font-weight: 500;
  padding: 0.5625rem 1rem;
  border-radius: 18px;
  font-size: 0.875rem;
  box-shadow: $btnBoxShadow;
  &:disabled {
    opacity: 0.5;
  }
}
</style>
