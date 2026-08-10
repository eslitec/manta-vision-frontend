<template lang="pug">
.brandtoggle(:class="{ 'is-on': modelValue }" @click="$emit('update:modelValue', !modelValue)")
  span.brandtoggle__switch(:class="{ 'is-on': modelValue }")
    span.brandtoggle__knob
  .brandtoggle__col
    span.brandtoggle__title 套用品牌設定
    span.brandtoggle__sub {{ description }}
  span.brandtoggle__edit(@click.stop="$emit('edit')") 編輯
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue: boolean; description?: string }>(), {
  description: '品牌色票・浮水印',
})
defineEmits<{ 'update:modelValue': [boolean]; edit: [] }>()
</script>

<style scoped lang="scss">
.brandtoggle {
  @include flex(flex-start, center, 10px);
  background: $white;
  border: 1px solid $gray;
  border-radius: 8px;
  padding: 10px 12px;
  width: 100%;
  cursor: pointer;
  &.is-on {
    background: $blue-light;
    border-color: transparent;
  }
  &__switch {
    width: 32px;
    height: 18px;
    border-radius: 9px;
    background: $gray;
    position: relative;
    flex-shrink: 0;
    transition: background 0.15s;
    &.is-on {
      background: $blue-dark-500;
    }
  }
  &__knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: $white;
    transition: transform 0.15s;
  }
  &__switch.is-on &__knob {
    transform: translateX(14px);
  }
  &__col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  &__title {
    font-size: 14px;
    font-weight: 500;
    color: #606692;
  }
  &__sub {
    font-size: 12px;
    color: $gray-100;
  }
  &__edit {
    font-size: 12px;
    font-weight: 500;
    color: $blue-dark-500;
    flex-shrink: 0;
  }
}
</style>
