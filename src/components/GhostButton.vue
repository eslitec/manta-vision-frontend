<template lang="pug">
button.ghost-btn
  slot
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.ghost-btn {
  border: 1px solid $gray;
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 14px;
  color: $blue-dark-300;
  background: $white;
  &:hover {
    border-color: $blue;
  }
}
</style>
