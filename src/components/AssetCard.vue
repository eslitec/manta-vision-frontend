<template lang="pug">
article.assetCard(:class="{ 'isSelected': selected }")
  AppCheckbox.assetCard__check(:model-value="selected" :label="name" @update:model-value="$emit('toggle')")
  .assetCard__thumb
    IconMovie(v-if="type === 'video'" aria-hidden="true")
    img.assetCard__imagePlaceholder(v-else :src="imagePlaceholderUrl" alt="" aria-hidden="true")
  h3.assetCard__name {{ name }}
  .assetCard__meta
    AppPill(:tone="tag === 'aiGenerate' ? 'tag' : 'neutral'") {{ tagLabel }}
    span.assetCard__dimensions {{ dimensions }}
</template>

<script setup lang="ts">
import AppCheckbox from '@/components/AppCheckbox.vue'
import AppPill from '@/components/AppPill.vue'
import { IconMovie } from '@/components/icons'
import imagePlaceholderUrl from '@/assets/images/library-image-placeholder.svg'

withDefaults(
  defineProps<{
    name: string
    tag: string
    tagLabel: string
    dimensions: string
    type?: 'image' | 'video'
    selected?: boolean
  }>(),
  {
    type: 'image',
    selected: false,
  },
)

defineEmits<{ toggle: [] }>()
</script>

<style scoped lang="scss">
.assetCard {
  position: relative;
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.25rem;
  border-radius: 10px;

  &.isSelected {
    background: $blue-light;
    box-shadow: inset 0 0 0 2px $blue-dark-500;
  }

  &__check {
    position: absolute;
    top: 0.625rem;
    left: 0.625rem;
    z-index: 1;
  }

  &__thumb {
    @include flex(center, center);
    width: 100%;
    aspect-ratio: 244 / 152;
    border-radius: 8px;
    background: #eef1f7;
    color: $babyBlue;
    font-size: 2.5rem;
  }

  &__imagePlaceholder {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__name {
    overflow: hidden;
    color: $dark-blue-gray;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.0625rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    @include flex(flex-start, center, 0.5rem);
    min-width: 0;
    overflow: hidden;
  }

  &__dimensions {
    overflow: hidden;
    color: $gray-100;
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
