<template lang="pug">
button.ghostBtn
  slot
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.ghostBtn {
  border: 1px solid $blue-dark-500;
  border-radius: 18px;
  padding: 0.5625rem 1rem;
  font-size: 0.875rem;
  color: $blue-dark-500;
  background: $white;
  box-shadow: $btnBoxShadow;
  &:hover {
    border-color: $blue;
  }
}
</style>
