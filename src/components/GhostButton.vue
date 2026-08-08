<template lang="pug">
button.ghost-btn
  slot
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.ghost-btn {
  border: 1px solid $blue-dark-500;
  border-radius: 18px;
  padding: 9px 16px;
  font-size: 14px;
  color: $blue-dark-500;
  background: $white;
  box-shadow: $btnBoxShadow;
  &:hover {
    border-color: $blue;
  }
}
</style>
