<template lang="pug">
.layout
  aside.sidebar(:class="{ 'isOpen': sidebarOpen }")
    .sidebar__logo MantaGO
    .sidebar__brand
      span.sidebar__avatar
      .sidebar__brandText
        strong {{ t('brand.name') }}
        small Manta Vision
    .sidebar__divider(aria-hidden="true")
    nav.sidebar__nav
      router-link.sidebar__item(
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :aria-current="isActive(item) ? 'page' : undefined"
        :class="{ 'isActive': isActive(item) }"
      )
        span.sidebar__itemIcon
          component(:is="item.icon")
        span {{ item.label }}
    .sidebar__footer
      span.sidebar__footerLink {{ t('layout.documentation') }}
      button.sidebar__footerLink(type="button" @click="handleLogout") {{ t('layout.logout') }}
  .layout__overlay(v-if="sidebarOpen" @click="sidebarOpen = false")
  .main
    header.topbar
      button.topbar__menu(@click="sidebarOpen = true" :aria-label="t('layout.openMenu')")
        IconMenu
      .topbar__crumb
        span.topbar__cur {{ t('brand.name') }}
        span.topbar__sep ›
        span.topbar__cur Manta Vision
      .topbar__actions
        button.topbar__tasks(:aria-expanded="taskPanelOpen" aria-controls="generation-task-panel" @click="taskPanelOpen = !taskPanelOpen")
          span.topbar__tasksIcon
            IconTasksBadge
          span.topbar__tasksLabel {{ t('layout.tasks') }}
          span.topbar__tasksBadge(v-if="unreadCount > 0") {{ unreadCount }}
          span.topbar__tasksDot(v-else-if="activeCount > 0")
        FeedBadge
        .topbar__user
          span.topbar__userDot
          span {{ t('layout.owner', { name: session.session?.displayName ?? '' }) }}
    main.content
      .content__inner
        router-view
  TaskCenterPanel(v-model:open="taskPanelOpen")
  GenerationToast
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import FeedBadge from '@/components/FeedBadge.vue'
import TaskCenterPanel from '@/components/TaskCenterPanel.vue'
import GenerationToast from '@/components/GenerationToast.vue'
import {
  IconTasksBadge,
  IconAiSparkle,
  IconLibraryPhoto,
  IconFeedBottleSmall,
  IconSettings,
  IconMenu,
} from '@/components/icons'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const session = useSessionStore()
const taskPanelOpen = ref(false)
const sidebarOpen = ref(false)
watch(
  () => route.path,
  () => (sidebarOpen.value = false), // 換頁自動收起手機抽屜
)
const { activeCount, unreadCount } = storeToRefs(useGenerationTasksStore())
// 部分導覽項目除了自己的路徑外，還要涵蓋其他子路由才算選取中——
// 「AI 生成工作台」從首頁點進圖生圖／圖生影片／AI 產文／AI 試穿等
// 工具卡片後，會導到獨立的 /generate/* 路由，此時 sidebar 仍要保持
// 「AI 生成工作台」的選取狀態，而不是完全沒有項目被選取。
type NavItem = { label: string; icon: Component; to: string; activePrefixes?: string[] }
const isActive = (item: NavItem) => {
  const prefixes = item.activePrefixes ?? [item.to]
  return prefixes.some((prefix) => (prefix === '/' ? route.path === '/' : route.path.startsWith(prefix)))
}
const navItems = computed<NavItem[]>(() => [
  { label: t('nav.workbench'), icon: IconAiSparkle, to: '/', activePrefixes: ['/', '/generate'] },
  { label: t('nav.library'), icon: IconLibraryPhoto, to: '/library' },
  { label: t('nav.usage'), icon: IconFeedBottleSmall, to: '/usage' },
  { label: t('nav.settings'), icon: IconSettings, to: '/settings' },
])
async function handleLogout() {
  await session.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped lang="scss">
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 12.5rem;
  flex-shrink: 0;
  background: $blue-dark-500;
  color: $white;
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0;
  &__logo {
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.5rem;
    // logo_wrap：上 20（由 .sidebar 的 padding 提供）／下 12
    padding: 0 0 0.75rem;
  }
  &__brand {
    @include flex(flex-start, center, 0.75rem);
    background: $blue-light;
    border-radius: 0 10px 10px 0;
    margin: 0 -1rem;
    padding: 0.5rem 0.5rem 0.5rem 1rem;
    position: relative;
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      height: 2.375rem;
      width: 0.25rem;
      background: $golden;
    }
  }
  &__avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    background: #606692;
    flex-shrink: 0;
  }
  &__brandText {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
    strong {
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.375rem;
      color: $blue-dark-500;
    }
    small {
      color: #606692;
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.25rem;
    }
  }
  // Figma divider（node 216:727）：全寬 1px、半透明淺藍
  &__divider {
    height: 1px;
    margin: 0 -1rem;
    background: rgba(239, 242, 250, 0.5);
  }
  &__nav {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  &__item {
    // btn_sidebar_*：高 48、accent 4 + gap 8 到 icon、icon 20、lbl_wrap 再 pl 8
    @include flex(flex-start, center, 1rem);
    height: 3rem;
    margin: 0 -1rem;
    padding: 0 0.5rem 0 0.75rem;
    font-size: 1rem;
    line-height: 1.375rem;
    color: $white;
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    &.isActive {
      background: $blue-light;
      border-radius: 0 10px 10px 0;
      color: $blue-dark-500;
      font-weight: 700;
      position: relative;
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 2rem;
        width: 0.25rem;
        background: $golden;
      }
    }
  }
  &__itemIcon {
    width: 1.25rem;
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
    gap: 0;
    padding: 0 0 1.5rem;
  }
  &__footerLink {
    @include flex(flex-start, center);
    height: 3rem;
    margin: 0 -1rem;
    padding: 0 1rem;
    border: none;
    background: none;
    color: #606692;
    text-align: left;
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.125rem;
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
  height: 3.3125rem;
  padding: 0 1.5rem;
  background: $white;
  border-bottom: 1px solid $gray;
  &__crumb {
    @include flex(flex-start, center, 0.375rem);
    color: $gray-400;
    font-size: 1rem;
    white-space: nowrap;
  }
  &__cur {
    color: $blue-dark-500;
    font-weight: 700;
  }
  &__sep {
    color: $gray-100;
  }
  &__actions {
    @include flex(flex-start, center, 1rem);
    margin-left: auto;
  }
  &__user {
    @include flex(flex-start, center, 0.5rem);
    flex-shrink: 0;
    font-size: 0.875rem;
    color: #606692;
    white-space: nowrap;
  }
  &__userDot {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: #606692;
  }
  &__tasks {
    @include flex(flex-start, center, 0.375rem);
    position: relative;
    flex-shrink: 0;
    padding: 0.5625rem 0.75rem;
    border: none;
    border-radius: 18px;
    background: $blue-light;
    color: $blue-dark-500;
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
  }
  &__tasksIcon {
    @include flex(center, center);
    svg {
      display: block;
    }
  }
  &__tasksBadge {
    @include flex(center, center);
    min-width: 1.125rem;
    height: 1.125rem;
    padding: 0 0.25rem;
    border-radius: 999px;
    background: $blue-dark-300;
    color: $white;
    font-size: 0.6875rem;
    font-weight: 700;
  }
  &__tasksDot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: $green;
  }
}

.content {
  flex: 1;
  // 明確加 min-height:0：沒有這行，.content 這個直向 flex item 不保證會乖乖縮到
  // .main 分配給它的高度，反而可能被子內容（例如圖庫「快速修飾」選項變多）撐高，
  // 導致整個「頁面」本身多長出一截、瀏覽器右側跑出原生捲軸——明明 .content 自己
  // 就有 overflow-y:auto，該在它內部捲動才對，不該讓整頁一起被撐高再捲動。
  min-height: 0;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
}
.content__inner {
  width: 100%;
  flex: 1;
  min-height: 0;
}

// ── RWD：手機側邊欄抽屜（<768px）──
.topbar__menu {
  // 桌機隱藏；注意不可用 @include flex()，那會輸出 display:flex 蓋掉這個 none
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  background: none;
  color: $blue-dark-500;
  font-size: 1.375rem;
  margin-right: 0.25rem;
  @include below($bp-lg) {
    display: flex;
  }
}
.layout__overlay {
  display: none;
  @include below($bp-lg) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(23, 30, 82, 0.4);
  }
}
@include below($bp-lg) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    &.isOpen {
      transform: translateX(0);
    }
  }
  .topbar {
    padding: 0 0.75rem;
  }
  .topbar__crumb {
    display: none;
  }
  .topbar__actions {
    gap: 0.625rem;
  }
}
@include below($bp-md) {
  .content {
    padding: 1.25rem 1rem;
  }
  .content__inner {
    &::after {
      display: block;
      height: 1.25rem;
      content: '';
    }
  }
  .topbar__user span:last-child {
    display: none;
  }
}
@include below($bp-sm) {
  .topbar {
    padding: 0 0.5rem;
  }
  .topbar__menu {
    margin-right: 0;
  }
  .topbar__actions {
    gap: 0.25rem;
  }
  .topbar__tasks {
    width: 2.25rem;
    height: 2.25rem;
    justify-content: center;
    padding: 0;
  }
  .topbar__tasksLabel {
    display: none;
  }
}
</style>
