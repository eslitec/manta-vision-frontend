<template lang="pug">
.feed-badge
  span.feed-badge__icon 🪙
  span.feed-badge__num {{ balance.toLocaleString() }} {{ $t('feedBadge.unit') }}
  button.feed-badge__topup {{ $t('feedBadge.topup') }}
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useFeedStore } from '@/stores/feed'
const feed = useFeedStore()
const { balance } = storeToRefs(feed)
onMounted(() => { if (!feed.loaded) feed.refresh() })
</script>

<style scoped lang="scss">
.feed-badge {
  @include flex(flex-start, center, 8px);
  background: $white; border: 1px solid $gray; border-radius: 999px;
  padding: 4px 4px 4px 12px; font-size: 14px;
  &__num { font-weight: 700; color: $blue-dark-300; }
  &__topup { background: $orange; color: $white; font-weight: 600; border-radius: 999px; padding: 4px 12px; font-size: 13px; }
}
</style>
