<template lang="pug">
.home
  header.home__head
    h1.home__title {{ t('home.title') }}
    p.home__subtitle {{ t('home.subtitle') }}

  section.stats
    .stats__item
      .stats__num
        IconFeedBottleSmall.stats__numIcon
        | {{ balance.toLocaleString() }} #[small {{ t('units.feedShort') }}]
      .stats__label {{ t('home.feedBalance') }}
      .stats__hint {{ t('home.feedEstimate', { images: imgEst, videos: vidEst }) }}
    .stats__item
      .stats__num {{ generatedThisMonth.toLocaleString() }} #[small {{ t('units.images') }}]
      .stats__label {{ t('home.generatedThisMonth') }}
    .stats__item
      .stats__num.isOk(v-if="brandReady")
        IconCheckCircle.iconCheck
        | {{ t('home.brandComplete') }}
      .stats__num.isMuted(v-else) ○ {{ t('home.brandIncomplete') }}
      .stats__hint {{ brandReady ? t('home.brandCompleteHint') : t('home.brandIncompleteHint') }}
    AppButton(variant="secondary") {{ t('home.topup') }}

  h2.home__sectionTitle {{ t('home.sectionTitle') }}
  .cards
    router-link.card(v-for="t in genTools" :key="t.key" :to="t.to")
      .card__icon
        component(:is="t.icon")
      .card__body
        .card__title {{ t.title }}
        .card__desc {{ t.desc }}
      IconFeedBottleBadge.card__feedBadge

  router-link.card.card--wide(to="/library")
    .card__icon
      IconLibraryPhotoLarge
    .card__body
      .card__title {{ t('home.libraryTitle') }}
      .card__desc {{ t('home.libraryDescription') }}
    AppButton(tag="span" variant="outline") {{ t('home.openLibrary') }}
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useFeedStore } from '@/stores/feed'
import { useBrandStore } from '@/stores/brand'
import { api } from '@/api'
import type { UsageSummary } from '@/types/api'
import {
  IconGenImage,
  IconMarketingPost,
  IconGenVideo,
  IconTryOn,
  IconLibraryPhotoLarge,
  IconFeedBottleSmall,
  IconFeedBottleBadge,
  IconCheckCircle,
} from '@/components/icons'
import AppButton from '@/components/AppButton.vue'

const feed = useFeedStore()
const { balance } = storeToRefs(feed)
const brandStore = useBrandStore()
const { profile } = storeToRefs(brandStore)
const { t } = useI18n()

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

const genTools = computed(() => [
  {
    key: 'image',
    icon: IconGenImage,
    to: '/generate/image',
    title: t('home.tools.image.title'),
    desc: t('home.tools.image.description'),
  },
  {
    key: 'post',
    icon: IconMarketingPost,
    to: '/generate/post',
    title: t('home.tools.post.title'),
    desc: t('home.tools.post.description'),
  },
  {
    key: 'video',
    icon: IconGenVideo,
    to: '/generate/video',
    title: t('home.tools.video.title'),
    desc: t('home.tools.video.description'),
  },
  {
    key: 'tryon',
    icon: IconTryOn,
    to: '/generate/tryon',
    title: t('home.tools.tryOn.title'),
    desc: t('home.tools.tryOn.description'),
  },
])
</script>

<style scoped lang="scss">
.home {
  width: 100%; // 填滿側欄以外的整個內容區（對齊設計稿的滿版工作台）
  &__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: $blue-dark-500;
  }
  &__subtitle {
    color: #606692;
    margin-top: 0.25rem;
    font-size: 0.875rem;
  }
  &__sectionTitle {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 1.625rem 0 0.875rem;
    color: $blue-dark-500;
  }
}

.stats {
  @include flex(flex-start, center, 0);
  background: $white;
  border-radius: 10px;
  box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2);
  margin-top: 1rem;
  padding: 1.25rem;
  @include below($bp-md) {
    flex-direction: column;
    align-items: stretch;
  }
  &__item {
    flex: 1;
    display: flex;
    justify-content: center;

    flex-direction: column;
    position: relative;
    &:not(:first-child) {
      margin-left: 3rem;
      @include below($bp-md) {
        margin-left: 0;
        margin-top: 1rem;
        &::before {
          display: none;
        }
      }
      &::before {
        content: '';
        position: absolute;
        left: -1.5rem;
        top: 50%;
        transform: translateY(-50%);
        height: 2.5rem;
        width: 0.0625rem;
        background: $blue-light;
      }
      &:has(.isOk, .isMuted)::before {
        height: 2.5rem;
      }
    }
  }
  &__num {
    font-size: 1.5rem;
    font-weight: 700;
    color: $blue-dark-500;
    @include flex(flex-start, center, 0.375rem);
    small {
      align-self: flex-end;
      font-size: 0.875rem;
      font-weight: 500;
      color: $gray-100;
      margin-left: 0.25rem;
    }
    &.isOk {
      font-size: 1rem;
      color: $green;
    }
    &.isMuted {
      font-size: 1rem;
      color: $gray-400;
    }
  }
  :deep(.stats__numIcon) {
    flex-shrink: 0;
  }
  :deep(.iconCheck) {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }
  &__label {
    color: #606692;
    font-size: 0.75rem;
  }
  &__hint {
    color: $gray-100;
    font-size: 0.75rem;
  }
  :deep(.appButton) {
    align-self: center;
  }
}

.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @include below($bp-sm) {
    grid-template-columns: 1fr;
  }
}

.card {
  @include flex(flex-start, flex-start, 0.75rem);
  background: $white;
  border-radius: 10px;
  box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2);
  min-height: 7.75rem;
  padding: 1.25rem;
  text-align: left;
  position: relative;
  transition:
    box-shadow 0.15s,
    transform 0.15s;
  &:hover {
    transform: translateY(-0.0625rem);
  }
  &__icon {
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
    @include flex(center, center);
  }
  :deep(.card__feedBadge) {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    width: 1.75rem;
    height: 1.75rem;
  }
  &__body {
    flex: 1;
  }
  &__title {
    font-size: 1rem;
    font-weight: 700;
    color: $blue-dark-500;
    margin-bottom: 0.375rem;
  }
  &__desc {
    color: #606692;
    font-size: 0.875rem;
    line-height: 1.5;
  }
  &--wide {
    grid-column: 1 / -1;
    align-items: center;
    min-height: 0;
    margin-top: 1rem;
    padding: 1.25rem 0.75rem;
    border: 1px solid $gray;
    box-shadow: none;
  }
}
</style>
