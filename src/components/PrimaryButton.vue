<template lang="pug">
button.primary-btn
  slot
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.primary-btn {
  @include flex(center, center, 6px);
  background: $blue-dark-300;
  color: $white;
  font-weight: 600;
  padding: 11px 20px;
  border-radius: 10px;
  font-size: 14px;
  box-shadow: $btnBoxShadow;
  &:disabled {
    opacity: 0.5;
  }
}
</style>
