<template lang="pug">
button.modelOption(type="button" :aria-pressed="selected" :class="{ 'isSelected': selected }")
  span.modelOption__header
    span.modelOption__name {{ name }}
    span.modelOption__badge ×{{ multiplier }}
  span.modelOption__cost {{ cost }}
  span.modelOption__description {{ description }}
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    name: string
    multiplier: number
    cost: string
    description: string
    selected?: boolean
  }>(),
  { selected: false },
)
</script>

<style scoped lang="scss">
.modelOption {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1875rem;
  min-width: 0;
  padding: 0.625rem;
  border: 1px solid $gray;
  border-radius: 8px;
  background: $white;
  text-align: left;

  &__header {
    @include flex(space-between, center, 0.375rem);
    width: 100%;
  }

  &__name {
    color: $dark-blue-gray;
    font-size: 0.875rem;
    font-weight: 500;
  }

  &__badge {
    flex-shrink: 0;
    padding: 0.0625rem 0.375rem;
    border-radius: 10px;
    background: $blue-light;
    color: #606692;
    font-size: 0.6875rem;
    font-weight: 700;
  }

  &__cost {
    color: $dark-blue-gray;
    font-size: 0.75rem;
    font-weight: 500;
  }

  &__description {
    color: $gray-100;
    font-size: 0.6875rem;
  }

  &.isSelected {
    border: 1.5px solid $blue-dark-500;
    background: $blue-light;
  }

  &.isSelected &__name {
    color: $blue-dark-500;
  }

  &.isSelected &__badge {
    background: $blue-dark-500;
    color: $white;
  }

  &:focus-visible {
    outline: 2px solid $yellow;
    outline-offset: 2px;
  }
}
</style>
