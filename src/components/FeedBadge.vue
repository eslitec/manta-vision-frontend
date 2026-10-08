<template lang="pug">
.feedBadge
  button.feedBadge__icon(type="button" @click="topUpOpen = true" :aria-label="t('feedBadge.topup')")
    IconFeedBottleSmall
  span.feedBadge__num {{ t('feedBadge.balance', { count: balance.toLocaleString() }) }}
  AppButton(variant="secondary" size="compact" @click="topUpOpen = true") {{ t('feedBadge.topup') }}
  TopUpDialog(v-model:open="topUpOpen")
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useFeedStore } from '@/stores/feed'
import { IconFeedBottleSmall } from '@/components/icons'
import AppButton from '@/components/AppButton.vue'
import TopUpDialog from '@/components/TopUpDialog.vue'
const feed = useFeedStore()
const { balance } = storeToRefs(feed)
const { t } = useI18n()
const topUpOpen = ref(false)
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
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
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
