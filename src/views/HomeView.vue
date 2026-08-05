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
    .stats__item
      .stats__num {{ generatedThisMonth.toLocaleString() }} #[small 張]
      .stats__label 本月已生成
    .stats__item
      .stats__num.is-ok(v-if="brandReady")
        svg.icon-check(viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg")
          circle(cx="10" cy="10" r="9" fill="currentColor" opacity="0.15")
          path(d="M6 10.2l2.6 2.6L14.2 6.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
        | 品牌設定已完成
      .stats__num.is-muted(v-else) ○ 品牌設定待完成
      .stats__hint {{ brandReady ? '色票・語氣・浮水印皆已設定' : '前往設定補齊品牌資料' }}
    button.stats__topup ＋ 儲值飼料

  h2.home__section 要生成什麼？
  .cards
    router-link.card(v-for="t in genTools" :key="t.key" :to="t.to")
      .card__icon
        component(:is="t.icon")
      .card__body
        .card__title {{ t.title }}
        .card__desc {{ t.desc }}
      svg.card__feed-badge(width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg")
        path(d="M19.9398 20.6097H15.8231V19.5204L16.9252 19.0137V13.1617L15.8231 12.655V11.5657H19.9398V12.655L18.8378 13.1617V19.0137L19.9398 19.5204V20.6097Z" fill="white")
        path(d="M12.703 20.6097L12.0444 18.4564H8.75104L8.09237 20.6097H6.02771L9.21971 11.5278H11.563L14.7678 20.6097H12.703ZM10.9297 14.7451C10.8875 14.6015 10.8326 14.42 10.765 14.2004C10.6975 13.9809 10.6299 13.7571 10.5624 13.5291C10.4948 13.3012 10.4399 13.1027 10.3977 12.9338C10.3555 13.1027 10.2964 13.3138 10.2204 13.5672C10.1528 13.812 10.0853 14.0484 10.0177 14.2765C9.95859 14.4959 9.91215 14.6522 9.87838 14.7451L9.23237 16.8478H11.5884L10.9297 14.7451Z" fill="white")
        path(d="M4.66669 4.66669H23.3334V25.6667C23.3334 26.311 22.811 26.8334 22.1667 26.8334H5.83335C5.18903 26.8334 4.66669 26.311 4.66669 25.6667V4.66669Z" fill="#A5C8E6")
        path(d="M14 24.5C17.2217 24.5 19.8334 21.1048 19.8334 16.9166C19.8334 12.7285 17.2217 9.33331 14 9.33331C10.7784 9.33331 8.16669 12.7285 8.16669 16.9166C8.16669 21.1048 10.7784 24.5 14 24.5Z" fill="#EFF2FA")
        path(d="M23.3334 7H4.66669V9.33333H23.3334V7Z" fill="#606692" fill-opacity="0.4")
        path(d="M3.5 2.33335C3.5 1.68903 4.02234 1.16669 4.66667 1.16669H23.3333C23.9777 1.16669 24.5 1.68903 24.5 2.33335V7.00002C24.5 7.64435 23.9777 8.16669 23.3333 8.16669H4.66667C4.02234 8.16669 3.5 7.64435 3.5 7.00002V2.33335Z" fill="#606692")
        path(d="M18.0832 20.0928H15.3215V19.362L16.0608 19.0222V15.0962L15.3215 14.7563V14.0255H18.0832V14.7563L17.3439 15.0962V19.0222L18.0832 19.362V20.0928Z" fill="#F2BB00")
        path(d="M13.2283 20.0928L12.7864 18.6482H10.577L10.1351 20.0928H8.75L10.8914 14H12.4635L14.6134 20.0928H13.2283ZM12.0386 16.1584C12.0103 16.0621 11.9735 15.9403 11.9281 15.793C11.8829 15.6457 11.8375 15.4955 11.7922 15.3426C11.7468 15.1896 11.7101 15.0565 11.6817 14.9433C11.6534 15.0565 11.6137 15.1982 11.5627 15.3682C11.5174 15.5324 11.4721 15.6911 11.4268 15.844C11.3871 15.9913 11.356 16.0961 11.3333 16.1584L10.8999 17.5691H12.4805L12.0386 16.1584Z" fill="#F2BB00")

  router-link.card.card--wide(to="/library")
    .card__icon
      IconLibraryPhotoLarge
    .card__body
      .card__title 圖庫管理中心
      .card__desc 所有素材與生成結果的單一來源，模組輸入從這裡取、結果自動存回並記錄來源鏈。
    span.card__go 前往圖庫
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
    position: relative;
    &:not(:first-child) {
      margin-left: 48px;
      &::before {
        content: '';
        position: absolute;
        left: -24px;
        top: 0;
        bottom: 0;
        width: 1px;
        background: $gray;
      }
    }
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
      @include flex(flex-start, center, 6px);
    }
    &.is-muted {
      font-size: 18px;
      color: $gray-400;
    }
  }
  .icon-check {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
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
    background: $golden;
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
  &__feed-badge {
    position: absolute;
    top: 14px;
    right: 14px;
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
