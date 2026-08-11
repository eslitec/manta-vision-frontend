<template lang="pug">
button.secondaryBtn
  slot
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.secondaryBtn {
  @include flex(center, center, 0.375rem);
  padding: 0.5625rem 0.875rem;
  border: none;
  border-radius: 16px;
  background: $orange;
  color: $white;
  font-weight: 500;
  font-size: 0.875rem;
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
    transform: translateY(0.0625rem);
    box-shadow:
      $btnBoxShadow,
      0 0 0 3px #f2bb00;
  }
}
</style>
