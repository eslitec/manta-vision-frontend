<template lang="pug">
label.appSearchbar
  IconSearch.appSearchbar__icon
  input.appSearchbar__input(
    v-model="model"
    type="search"
    :aria-label="label"
    :placeholder="placeholder"
  )
</template>

<script setup lang="ts">
import { IconSearch } from '@/components/icons'

defineProps<{
  label: string
  placeholder?: string
}>()

const model = defineModel<string>({ required: true })
</script>

<style scoped lang="scss">
.appSearchbar {
  position: relative;
  display: block;
  width: 17.5rem;
  max-width: 100%;

  &__icon {
    position: absolute;
    top: 50%;
    left: 0.75rem;
    width: 1.25rem;
    height: 1.25rem;
    color: $gray-100;
    transform: translateY(-50%);
    pointer-events: none;
  }

  &__input {
    width: 100%;
    height: 2rem;
    padding: 0 0.75rem 0 2.5rem;
    border: 1px solid $gray;
    border-radius: 18px;
    background: $white;
    color: $dark-blue-gray;
    font-size: 0.875rem;
    outline: none;

    &::placeholder {
      color: $gray-100;
    }

    &:focus-visible {
      border-color: $blue-dark-500;
      box-shadow: 0 0 0 2px rgba(46, 53, 103, 0.16);
    }
  }
}
</style>
