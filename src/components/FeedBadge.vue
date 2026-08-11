<template lang="pug">
.feedBadge
  span.feedBadge__icon
    IconFeedBottleSmall
  span.feedBadge__num {{ t('feedBadge.balance', { count: balance.toLocaleString() }) }}
  TopupButton {{ t('feedBadge.topup') }}
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useFeedStore } from '@/stores/feed'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import TopupButton from '@/components/TopupButton.vue'
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
  background: $white;
  border: 1px solid $gray;
  border-radius: 999px;
  padding: 0.25rem 0.25rem 0.25rem 0.75rem;
  font-size: 0.875rem;
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
}
</style>
