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
    span.appCheckbox__check(v-else-if="model") ✓
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

  // 對齊 Figma checkbox（node 441:2640 的 chk 元件）：打勾本來就是純文字「✓」字元
  // （Noto Sans TC Bold），不是向量圖示，粗體字重才會跟設計稿一樣厚實
  &__check {
    font-weight: 700;
    line-height: 1;
  }
}
</style>
