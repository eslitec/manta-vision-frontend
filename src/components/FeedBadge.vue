<template lang="pug">
.feedBadge
  span.feedBadge__icon
    IconFeedBottleSmall
  span.feedBadge__num {{ t('feedBadge.balance', { count: balance.toLocaleString() }) }}
  AppButton(variant="secondary" size="compact") {{ t('feedBadge.topup') }}
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useFeedStore } from '@/stores/feed'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import AppButton from '@/components/AppButton.vue'
const feed = useFeedStore()
const { balance } = storeToRefs(feed)
const { t } = useI18n()
onMounted(() => {
  if (!feed.loaded) feed.refresh()
})
</script>

<style scoped lang="scss">
.feedBadge {
  @include flex(flex-start, center, 0.5rem);
  flex-shrink: 0;
  background: $white;
  border: 1px solid $gray;
  border-radius: 999px;
  padding: 0.25rem 0.25rem 0.25rem 0.75rem;
  font-size: 0.875rem;
  white-space: nowrap;
  &__icon {
    @include flex(center, center);
    svg {
      display: block;
    }
  }
  &__num {
    font-weight: 700;
    color: $blue-dark-300;
  }
  @include below($bp-sm) {
    gap: 0.25rem;
    padding-left: 0.5rem;
    &__icon {
      display: none;
    }
  }
}
</style>
