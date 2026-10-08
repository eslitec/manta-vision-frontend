<template lang="pug">
article.kpiCard
  header.kpiCard__header
    span.kpiCard__label {{ label }}
    StatusDot(v-if="tone" :tone="tone")
  strong.kpiCard__value {{ value }}
  span.kpiCard__hint {{ hint }}
</template>

<script setup lang="ts">
import StatusDot, { type StatusDotTone } from '@/components/StatusDot.vue'

defineProps<{
  label: string
  value: string
  hint: string
  tone?: StatusDotTone
}>()
</script>

<style scoped lang="scss">
.kpiCard {
  display: flex;
  width: 19.125rem;
  max-width: 100%;
  min-height: 6.4375rem;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem;
  border-radius: 10px;
  background: $white;

  &__header {
    @include flex(flex-start, center, 0.5rem);
  }

  &__label,
  &__hint {
    color: $gray-100;
    font-size: 0.875rem;
  }

  &__value {
    color: $dark-blue-gray;
    font-size: 1.5rem;
    font-weight: 700;
  }
}
</style>
