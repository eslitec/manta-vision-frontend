<template lang="pug">
.home
  header.home__head
    h1.home__title AI 視覺內容工作台
    p.home__subtitle 選一個任務開始生成，素材與結果都會自動存回圖庫。

  section.stats
    .stats__item
      .stats__num {{ balance.toLocaleString() }} #[small 顆]
      .stats__label AI 飼料餘額
      .stats__hint ≈ 可生成 {{ imgEst }} 張圖 / {{ vidEst }} 支短影片
    .stats__divider
    .stats__item
      .stats__num {{ generatedThisMonth.toLocaleString() }} #[small 張]
      .stats__label 本月已生成
    .stats__divider
    .stats__item
      .stats__num.is-ok(v-if="brandReady") ✓ 品牌設定已完成
      .stats__num.is-muted(v-else) ○ 品牌設定待完成
      .stats__hint {{ brandReady ? '色票・語氣・浮水印皆已設定' : '前往設定補齊品牌資料' }}
    button.stats__topup ＋ 儲值飼料

  h2.home__section 要生成什麼？
  .cards
    router-link.card(v-for="t in genTools" :key="t.key" :to="t.to")
      .card__icon(:style="{ background: t.tint }") {{ t.emoji }}
      .card__body
        .card__title {{ t.title }}
        .card__desc {{ t.desc }}

  router-link.card.card--wide(to="/library")
    .card__icon(:style="{ background: '#EFF2FA' }") 🖼
    .card__body
      .card__title 圖庫管理中心
      .card__desc 所有素材與生成結果的單一來源；各模組從這裡取用，結果可存回並記錄來源鏈。
    span.card__go 前往圖庫
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

const genTools = [
  {
    key: 'image',
    emoji: '🅰',
    tint: '#E8F0FF',
    to: '/generate/image',
    title: '圖生圖',
    desc: '以參考圖＋文字描述生成新圖，AI 輔助撰寫 prompt。',
  },
  {
    key: 'post',
    emoji: '📝',
    tint: '#EAF7EE',
    to: '/generate/post',
    title: 'AI 產生行銷 PO 文',
    desc: '商品圖一鍵生成貼文文案與配圖，支援多種比例。',
  },
  {
    key: 'video',
    emoji: '🎬',
    tint: '#E8F0FF',
    to: '/generate/video',
    title: '圖生影片',
    desc: '單張圖套用動態模板，生成 5-10 秒短影片。',
  },
  {
    key: 'tryon',
    emoji: '👕',
    tint: '#FDF3E7',
    to: '/generate/tryon',
    title: 'AI 試穿衣服',
    desc: '模特照＋服飾素材合成試穿圖，與圖庫直接打通。',
  },
]
</script>

<style scoped lang="scss">
.home {
  max-width: 1120px;
  &__title {
    font-size: 28px;
    font-weight: 800;
    color: $blue-dark-300;
  }
  &__subtitle {
    color: $gray-400;
    margin-top: 6px;
    font-size: 15px;
  }
  &__section {
    font-size: 18px;
    font-weight: 700;
    margin: 26px 0 14px;
    color: $blue-dark-300;
  }
}

.stats {
  @include flex(flex-start, stretch, 0);
  @include card;
  margin-top: 22px;
  padding: 22px 26px;
  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  &__divider {
    width: 1px;
    background: $gray;
    margin: 0 24px;
  }
  &__num {
    font-size: 26px;
    font-weight: 800;
    color: $blue-dark-300;
    small {
      font-size: 14px;
      font-weight: 500;
      color: $gray-400;
      margin-left: 4px;
    }
    &.is-ok {
      font-size: 18px;
      color: $green;
    }
    &.is-muted {
      font-size: 18px;
      color: $gray-400;
    }
  }
  &__label {
    color: $gray-400;
    font-size: 14px;
  }
  &__hint {
    color: $gray-100;
    font-size: 12px;
  }
  &__topup {
    align-self: center;
    background: $orange;
    color: $white;
    font-weight: 700;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 15px;
    box-shadow: $btnBoxShadow;
  }
}

.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.card {
  @include card;
  @include flex(flex-start, flex-start, 14px);
  padding: 20px;
  text-align: left;
  transition:
    box-shadow 0.15s,
    transform 0.15s;
  &:hover {
    box-shadow: $boxShadow;
    transform: translateY(-1px);
  }
  &__icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    flex-shrink: 0;
    @include flex(center, center);
    font-size: 20px;
  }
  &__body {
    flex: 1;
  }
  &__title {
    font-size: 16px;
    font-weight: 700;
    color: $blue-dark-300;
    margin-bottom: 6px;
  }
  &__desc {
    color: $gray-400;
    font-size: 13.5px;
    line-height: 1.5;
  }
  &--wide {
    grid-column: 1 / -1;
    align-items: center;
    margin-top: 16px;
  }
  &__go {
    border: 1px solid $gray;
    border-radius: 999px;
    padding: 8px 18px;
    font-size: 14px;
    color: $blue-dark-300;
    white-space: nowrap;
  }
}
</style>
