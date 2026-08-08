<template lang="pug">
.home
  header.home__head
    h1.home__title AI 視覺內容工作台
    p.home__subtitle 選一個任務開始生成，素材與結果都會自動存回圖庫。

  section.stats
    .stats__item
      .stats__num
        IconFeedBottleSmall.stats__num-icon
        | {{ balance.toLocaleString() }} #[small 顆]
      .stats__label AI 飼料餘額
      .stats__hint ≈ 可生成 {{ imgEst }} 張圖 / {{ vidEst }} 支短影片
    .stats__item
      .stats__num {{ generatedThisMonth.toLocaleString() }} #[small 張]
      .stats__label 本月已生成
    .stats__item
      .stats__num.is-ok(v-if="brandReady")
        IconCheckCircle.icon-check
        | 品牌設定已完成
      .stats__num.is-muted(v-else) ○ 品牌設定待完成
      .stats__hint {{ brandReady ? '色票・語氣・浮水印皆已設定' : '前往設定補齊品牌資料' }}
    TopupButton ＋ 儲值飼料

  h2.home__section 要生成什麼？
  .cards
    router-link.card(v-for="t in genTools" :key="t.key" :to="t.to")
      .card__icon
        component(:is="t.icon")
      .card__body
        .card__title {{ t.title }}
        .card__desc {{ t.desc }}
      IconFeedBottleBadge.card__feed-badge

  router-link.card.card--wide(to="/library")
    .card__icon
      IconLibraryPhotoLarge
    .card__body
      .card__title 圖庫管理中心
      .card__desc 所有素材與生成結果的單一來源，模組輸入從這裡取、結果自動存回並記錄來源鏈。
    OutlineButton(tag="span") 前往圖庫
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useFeedStore } from '@/stores/feed'
import { useBrandStore } from '@/stores/brand'
import { api } from '@/api'
import type { UsageSummary } from '@/types/api'
import IconGenImage from '@/components/icons/IconGenImage.vue'
import IconMarketingPost from '@/components/icons/IconMarketingPost.vue'
import IconGenVideo from '@/components/icons/IconGenVideo.vue'
import IconTryOn from '@/components/icons/IconTryOn.vue'
import IconLibraryPhotoLarge from '@/components/icons/IconLibraryPhotoLarge.vue'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import IconFeedBottleBadge from '@/components/icons/IconFeedBottleBadge.vue'
import IconCheckCircle from '@/components/icons/IconCheckCircle.vue'
import TopupButton from '@/components/TopupButton.vue'
import OutlineButton from '@/components/OutlineButton.vue'

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
    icon: IconGenImage,
    to: '/generate/image',
    title: '圖生圖',
    desc: '以參考圖＋文字描述生成新圖，AI 輔助撰寫 prompt。',
  },
  {
    key: 'post',
    icon: IconMarketingPost,
    to: '/generate/post',
    title: 'AI 產生行銷 PO 文',
    desc: '商品圖一鍵生成貼文文案與配圖，支援多種比例。',
  },
  {
    key: 'video',
    icon: IconGenVideo,
    to: '/generate/video',
    title: '圖生影片',
    desc: '單張圖套用動態模板，生成 5-10 秒短影片。',
  },
  {
    key: 'tryon',
    icon: IconTryOn,
    to: '/generate/tryon',
    title: 'AI 試穿衣服',
    desc: '模特照＋服飾素材合成試穿圖，與圖庫直接打通。',
  },
]
</script>

<style scoped lang="scss">
.home {
  &__title {
    font-size: 24px;
    font-weight: 700;
    color: $blue-dark-300;
  }
  &__subtitle {
    color: $gray-400;
    margin-top: 4px;
    font-size: 14px;
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
  padding: 20px;
  &__item {
    flex: 1;
    display: flex;
    justify-content: center;

    flex-direction: column;
    position: relative;
    &:not(:first-child) {
      margin-left: 48px;
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        height: 40px;
        width: 1px;
        background: $gray;
      }
      &:has(.is-ok, .is-muted)::before {
        height: 40px;
      }
    }
  }
  &__num {
    font-size: 24px;
    font-weight: 700;
    color: $blue-dark-300;
    @include flex(flex-start, center, 6px);
    small {
      align-self: flex-end;
      font-size: 14px;
      font-weight: 500;
      color: $gray-100;
      margin-left: 4px;
    }
    &.is-ok {
      font-size: 16px;
      color: $green;
    }
    &.is-muted {
      font-size: 16px;
      color: $gray-400;
    }
  }
  :deep(.stats__num-icon) {
    flex-shrink: 0;
  }
  :deep(.icon-check) {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
  &__label {
    color: $gray-400;
    font-size: 12px;
  }
  &__hint {
    color: $gray-100;
    font-size: 12px;
  }
  :deep(.secondary-btn) {
    align-self: center;
  }
}

.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.card {
  @include card;
  @include flex(flex-start, flex-start, 12px);
  padding: 20px;
  text-align: left;
  position: relative;
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
    flex-shrink: 0;
    @include flex(center, center);
  }
  :deep(.card__feed-badge) {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 28px;
    height: 28px;
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
    font-size: 14px;
    line-height: 1.5;
  }
  &--wide {
    grid-column: 1 / -1;
    align-items: center;
    margin-top: 16px;
  }
}
</style>
