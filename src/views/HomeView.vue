<template lang="pug">
.home
  header.home__head
    h1.home__title {{ $t('home.title') }}
    p.home__subtitle {{ $t('home.subtitle') }}

  section.stats
    .stats__item
      .stats__num {{ balance.toLocaleString() }} #[small {{ $t('home.unitFeed') }}]
      .stats__label {{ $t('home.feedBalance') }}
      .stats__hint {{ $t('home.feedHint', { img: imgEst, vid: vidEst }) }}
    .stats__divider
    .stats__item
      .stats__num {{ generatedThisMonth.toLocaleString() }} #[small {{ $t('home.unitImages') }}]
      .stats__label {{ $t('home.generatedThisMonth') }}
    .stats__divider
    .stats__item
      .stats__num.is-ok(v-if="brandReady") {{ $t('home.brandDone') }}
      .stats__num.is-muted(v-else) {{ $t('home.brandTodo') }}
      .stats__hint {{ brandReady ? $t('home.brandHint') : $t('home.brandTodoHint') }}
    button.stats__topup {{ $t('home.topup') }}

  h2.home__section {{ $t('home.sectionWhat') }}
  .cards
    router-link.card(v-for="t in genTools" :key="t.key" :to="t.to")
      .card__icon(:style="{ background: t.tint }") {{ t.emoji }}
      .card__body
        .card__title {{ $t('home.tools.' + t.key + '.title') }}
        .card__desc {{ $t('home.tools.' + t.key + '.desc') }}

  router-link.card.card--wide(to="/library")
    .card__icon(:style="{ background: '#EFF2FA' }") 🖼
    .card__body
      .card__title {{ $t('home.libraryCard.title') }}
      .card__desc {{ $t('home.libraryCard.desc') }}
    span.card__go {{ $t('home.libraryCard.go') }}
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useFeedStore } from '@/stores/feed'
import { useBrandStore } from '@/stores/brand'
import { api } from '@/api'
import type { UsageSummary } from '@/types/api'

const feed = useFeedStore()
const { balance } = storeToRefs(feed)
const brandStore = useBrandStore()
const { profile } = storeToRefs(brandStore)

const usage = ref<UsageSummary | null>(null)

onMounted(async () => {
  if (!feed.loaded) feed.refresh()
  brandStore.load()
  usage.value = await api.getUsage()
})

// 本月已生成張數（後端 getUsage 提供）
const generatedThisMonth = computed(() => usage.value?.generatedThisMonth ?? 0)
// 依餘額粗估可再生成多少（單張約 8 顆、單片約 45 顆）
const imgEst = computed(() => Math.floor(balance.value / 8))
const vidEst = computed(() => Math.floor(balance.value / 45))
// 品牌設定是否已完成（有名稱、定位與色票即視為完成）
const brandReady = computed(() => {
  const p = profile.value
  return !!(p && p.name && p.positioning && p.colors.length)
})

// 文字由 i18n（home.tools.<key>）提供，這裡只保留與語言無關的資料
const genTools = [
  { key: 'image', emoji: '🅰', tint: '#E8F0FF', to: '/generate/image' },
  { key: 'post', emoji: '📝', tint: '#EAF7EE', to: '/generate/post' },
  { key: 'video', emoji: '🎬', tint: '#E8F0FF', to: '/generate/video' },
  { key: 'tryon', emoji: '👕', tint: '#FDF3E7', to: '/generate/tryon' },
]
</script>

<style scoped lang="scss">
.home {
  max-width: 1120px;
  &__title { font-size: 28px; font-weight: 800; color: $blue-dark-300; }
  &__subtitle { color: $gray-400; margin-top: 6px; font-size: 15px; }
  &__section { font-size: 18px; font-weight: 700; margin: 26px 0 14px; color: $blue-dark-300; }
}

.stats {
  @include flex(flex-start, stretch, 0);
  @include card;
  margin-top: 22px; padding: 22px 26px;
  &__item { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  &__divider { width: 1px; background: $gray; margin: 0 24px; }
  &__num { font-size: 26px; font-weight: 800; color: $blue-dark-300;
    small { font-size: 14px; font-weight: 500; color: $gray-400; margin-left: 4px; }
    &.is-ok { font-size: 18px; color: $green; }
    &.is-muted { font-size: 18px; color: $gray-400; }
  }
  &__label { color: $gray-400; font-size: 14px; }
  &__hint { color: $gray-100; font-size: 12px; }
  &__topup {
    align-self: center; background: $orange; color: $white; font-weight: 700;
    padding: 12px 20px; border-radius: 10px; font-size: 15px; box-shadow: $btnBoxShadow;
  }
}

.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.card {
  @include card;
  @include flex(flex-start, flex-start, 14px);
  padding: 20px; text-align: left; transition: box-shadow .15s, transform .15s;
  &:hover { box-shadow: $boxShadow; transform: translateY(-1px); }
  &__icon {
    width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
    @include flex(center, center); font-size: 20px;
  }
  &__body { flex: 1; }
  &__title { font-size: 16px; font-weight: 700; color: $blue-dark-300; margin-bottom: 6px; }
  &__desc { color: $gray-400; font-size: 13.5px; line-height: 1.5; }
  &--wide { grid-column: 1 / -1; align-items: center; margin-top: 16px; }
  &__go {
    border: 1px solid $gray; border-radius: 999px; padding: 8px 18px;
    font-size: 14px; color: $blue-dark-300; white-space: nowrap;
  }
}
</style>
