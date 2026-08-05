<template lang="pug">
.layout
  aside.sidebar
    .sidebar__logo MantaGO
    .sidebar__brand
      span.sidebar__avatar
      .sidebar__brand-text
        strong 日安選物
        small Manta Vision
    nav.sidebar__nav
      router-link.sidebar__item(
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="{ 'is-active': isActive(item.to) }"
      )
        span.sidebar__item-icon
          component(:is="item.icon")
        span {{ item.label }}
    .sidebar__footer
      span.sidebar__footer-link 教學文件
      span.sidebar__footer-link 登出
  .main
    header.topbar
      .topbar__crumb
        span.topbar__cur 日安選物
        span.topbar__sep ›
        span.topbar__cur Manta Vision
      .topbar__right
        button.topbar__tasks
          span.topbar__tasks-icon
            IconPlayTriangle
          | 任務
        FeedBadge
        .topbar__user
          span.topbar__user-dot
          span Mavis｜擁有者
    main.content
      router-view
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import FeedBadge from '@/components/FeedBadge.vue'
import IconPlayTriangle from '@/components/icons/IconPlayTriangle.vue'
import IconAiSparkle from '@/components/icons/IconAiSparkle.vue'
import IconLibraryPhoto from '@/components/icons/IconLibraryPhoto.vue'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import IconSettings from '@/components/icons/IconSettings.vue'

const route = useRoute()
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const navItems = [
  { label: 'AI 生成工作台', icon: IconAiSparkle, to: '/' },
  { label: '圖庫管理中心', icon: IconLibraryPhoto, to: '/library' },
  { label: '飼料用量', icon: IconFeedBottleSmall, to: '/usage' },
  { label: '設定', icon: IconSettings, to: '/settings' },
]
</script>

<style scoped lang="scss">
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  flex-shrink: 0;
  background: $blue-dark-200;
  color: $white;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  &__logo {
    font-size: 20px;
    font-weight: 700;
    padding: 4px 0;
  }
  &__brand {
    @include flex(flex-start, center, 10px);
    background: $white;
    border-radius: 10px;
    margin: 0 -16px;
    padding: 10px 16px;
    position: relative;
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      height: 38px;
      width: 4px;
      background: $golden;
    }
  }
  &__avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: $babyBlue;
    flex-shrink: 0;
  }
  &__brand-text {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
    strong {
      font-size: 16px;
      font-weight: 700;
      line-height: 1.375;
      color: $blue-dark-300;
    }
    small {
      color: #606692;
      font-size: 14px;
      font-weight: 400;
      line-height: 1.4286;
    }
  }
  &__nav {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 6px;
  }
  &__item {
    @include flex(flex-start, center, 10px);
    margin: 0 -14px;
    padding: 13px 12px;
    border-radius: 8px;
    font-size: 15px;
    color: rgba(255, 255, 255, 0.85);
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    &.is-active {
      background: $white;
      color: $blue-dark-300;
      font-weight: 700;
      position: relative;
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 20px;
        width: 4px;
        background: $golden;
      }
    }
  }
  &__item-icon {
    width: 20px;
    flex-shrink: 0;
    @include flex(center, center);
    svg {
      display: block;
    }
  }
  &__footer {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 15px 0;
  }
  &__footer-link {
    color: rgba(255, 255, 255, 0.35);
    font-size: 13px;
    padding: 6px 0;
  }
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  @include flex(space-between, center);
  height: 60px;
  padding: 0 24px;
  background: $white;
  border-bottom: 1px solid $gray;
  &__crumb {
    @include flex(flex-start, center, 6px);
    color: $gray-400;
    font-size: 16px;
  }
  &__cur {
    color: $blue-dark-300;
    font-weight: 700;
  }
  &__sep {
    color: $gray-100;
  }
  &__right {
    @include flex(flex-start, center, 16px);
  }
  &__user {
    @include flex(flex-start, center, 8px);
    font-size: 14px;
    color: $gray-400;
  }
  &__user-dot {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: $gray;
  }
  &__tasks {
    @include flex(flex-start, center, 6px);
    height: 32px;
    padding: 0 14px;
    border: none;
    border-radius: 999px;
    background: $blue-light;
    color: $blue-dark-300;
    font-size: 13px;
    font-weight: 700;
  }
  &__tasks-icon {
    @include flex(center, center);
    svg {
      display: block;
    }
  }
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}
</style>
