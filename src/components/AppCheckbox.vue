<template lang="pug">
label.appCheckbox
  input.appCheckbox__input(
    ref="inputRef"
    v-model="model"
    type="checkbox"
    :aria-label="label"
    :disabled="disabled"
  )
  span.appCheckbox__box(aria-hidden="true")
    span.appCheckbox__mark(v-if="indeterminate") −
    svg.appCheckbox__check(v-else-if="model" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg")
      path(d="M7.013 13.753C6.84433 13.2837 6.661 12.8437 6.463 12.433C6.27233 12.015 6.06333 11.6117 5.836 11.223C5.60867 10.8343 5.352 10.4383 5.066 10.035L6.1 9.353C6.44467 9.859 6.74533 10.3833 7.002 10.926C7.25867 11.4613 7.48967 11.993 7.695 12.521H7.739C7.959 11.773 8.21933 11.0433 8.52 10.332C8.828 9.61333 9.16167 8.92767 9.521 8.275C9.88767 7.615 10.2763 7.00267 10.687 6.438C11.105 5.87333 11.534 5.371 11.974 4.931L12.975 5.811C12.3883 6.361 11.82 7.01367 11.27 7.769C10.72 8.52433 10.2103 9.386 9.741 10.354C9.279 11.3147 8.883 12.3853 8.553 13.566L7.013 13.753Z" fill="currentColor")
  span.appCheckbox__label(v-if="$slots.default")
    slot
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    label?: string
    indeterminate?: boolean
    disabled?: boolean
  }>(),
  {
    label: undefined,
    indeterminate: false,
    disabled: false,
  },
)

const model = defineModel<boolean>({ required: true })
const inputRef = ref<HTMLInputElement | null>(null)

const syncIndeterminate = () => {
  if (inputRef.value) inputRef.value.indeterminate = props.indeterminate
}

onMounted(syncIndeterminate)
watch(() => props.indeterminate, syncIndeterminate)
</script>

<style scoped lang="scss">
.appCheckbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;

  &__input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  &__box {
    @include flex(center, center);
    width: 1.125rem;
    height: 1.125rem;
    flex: 0 0 1.125rem;
    border: 1px solid $gray;
    border-radius: 4px;
    background: $white;
    color: $white;
    font-size: 0.6875rem;
  }

  &__input:checked + &__box,
  &__input:indeterminate + &__box {
    border-color: $blue-dark-500;
    background: $blue-dark-500;
  }

  &__input:focus-visible + &__box {
    outline: 2px solid $yellow;
    outline-offset: 2px;
  }

  &__input:disabled + &__box,
  &__input:disabled ~ &__label {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &__mark {
    line-height: 1;
  }

  // 使用者提供圖庫管理中心用的打勾 SVG（18x18，viewBox 對齊這顆 box 本身的 1.125rem
  // 尺寸），改用向量圖示取代原本的純文字「✓」字元（原本對齊 Figma node 441:2640 的
  // 決定），各瀏覽器／字型渲染更一致、線條粗細也更接近設計稿。
  &__check {
    width: 100%;
    height: 100%;
    display: block;
  }
}
</style>
