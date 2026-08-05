<template lang="pug">
button.topup-btn
  slot
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.topup-btn {
  @include flex(center, center, 6px);
  padding: 9px 14px;
  border: none;
  border-radius: 16px;
  background: $orange;
  color: $white;
  font-weight: 700;
  font-size: 15px;
  box-shadow: $btnBoxShadow;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: $orange-light;
  }
  &:active {
    background: $orange-dark;
  }
}
</style>
