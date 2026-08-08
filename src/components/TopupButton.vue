<template lang="pug">
button.secondary-btn
  slot
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.secondary-btn {
  @include flex(center, center, 6px);
  padding: 9px 14px;
  border: none;
  border-radius: 16px;
  background: $orange;
  color: $white;
  font-weight: 500;
  font-size: 14px;
  box-shadow: $btnBoxShadow;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: $orange-light;
  }
  &:disabled {
    background: $gray;
    cursor: not-allowed;
  }
  /* pressed/active style: translate and remove shadow for a pressed effect */
  &:active {
    background: $orange-dark;
    transform: translateY(1px);
    box-shadow:
      $btnBoxShadow,
      0 0 0 3px #f2bb00;
  }
}
</style>
