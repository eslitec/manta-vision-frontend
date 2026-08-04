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
        span.sidebar__item-icon {{ item.icon }}
        span {{ item.label }}
  .main
    header.topbar
      .topbar__crumb
        span 日安選物
        span.topbar__sep ›
        span.topbar__cur Manta Vision
      .topbar__right
        FeedBadge
        .topbar__user
          span.topbar__user-dot
          span Mavis｜管理者
    main.content
      router-view
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import FeedBadge from '@/components/FeedBadge.vue'

const route = useRoute()
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const navItems = [
  { label: 'AI 生成工作台', icon: '🅰', to: '/' },
  { label: '圖庫管理中心', icon: '🖼', to: '/library' },
  { label: '飼料用量', icon: '📊', to: '/usage' },
  { label: '設定', icon: '⚙', to: '/settings' },
]
</script>

<style scoped lang="scss">
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: $blue-dark-200;
  color: $white;
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  &__logo {
    font-size: 20px;
    font-weight: 700;
    padding: 4px 10px;
  }
  &__brand {
    @include flex(flex-start, center, 10px);
    background: rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 10px;
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
      font-size: 15px;
    }
    small {
      color: $gray-100;
      font-size: 12px;
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
    padding: 11px 12px;
    border-radius: 8px;
    font-size: 15px;
    color: rgba(255, 255, 255, 0.85);
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    &.is-active {
      background: $white;
      color: $blue-dark-300;
      font-weight: 600;
    }
  }
  &__item-icon {
    width: 20px;
    text-align: center;
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
    font-size: 15px;
  }
  &__cur {
    color: $blue-dark-300;
    font-weight: 600;
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
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
}
</style>
