<template lang="pug">
button.folderRow(type="button" :class="{ 'isActive': active, 'isDropTarget': dropTarget }" :aria-pressed="active")
  IconFolder.folderRow__icon(aria-hidden="true")
  span.folderRow__name {{ name }}
  span.folderRow__count {{ count }}
</template>

<script setup lang="ts">
import IconFolder from '@/components/icons/IconFolder.vue'

withDefaults(
  defineProps<{
    name: string
    count: number
    active?: boolean
    dropTarget?: boolean
  }>(),
  {
    active: false,
    dropTarget: false,
  },
)
</script>

<style scoped lang="scss">
.folderRow {
  @include flex(flex-start, center, 0.5rem);
  width: 100%;
  height: 2.25rem;
  padding: 0 0.625rem;
  border: 1.5px dashed transparent;
  border-radius: 8px;
  color: $dark-blue-gray;
  font-size: 0.875rem;
  text-align: left;

  &:hover,
  &.isActive {
    background: $blue-light;
  }

  &.isActive {
    border-color: $blue-dark-500;
    color: $blue-dark-500;
    font-weight: 500;

    .folderRow__icon {
      color: $blue-dark-500;
    }
  }

  &.isDropTarget {
    border-color: $blue-dark-500;
    background: $blue-light;
  }

  &__icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    color: $gray-100;
  }

  &__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__count {
    color: $gray-100;
    font-size: 0.75rem;
    font-weight: 400;
  }
}
</style>
