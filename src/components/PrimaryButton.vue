<template lang="pug">
button.primary-btn
  slot
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.primary-btn {
  @include flex(center, center, 6px);
  background: $blue-dark-500;
  color: $white;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 18px;
  font-size: 14px;
  box-shadow: $btnBoxShadow;
  &:disabled {
    opacity: 0.5;
  }
}
</style>
