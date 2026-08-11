<template lang="pug">
.layout
  aside.sidebar(:class="{ 'isOpen': sidebarOpen }")
    .sidebar__logo MantaGO
    .sidebar__brand
      span.sidebar__avatar
      .sidebar__brandText
        strong {{ t('brand.name') }}
        small Manta Vision
    nav.sidebar__nav
      router-link.sidebar__item(
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :class="{ 'isActive': isActive(item.to) }"
      )
        span.sidebar__itemIcon
          component(:is="item.icon")
        span {{ item.label }}
    .sidebar__footer
      span.sidebar__footerLink {{ t('layout.documentation') }}
      span.sidebar__footerLink {{ t('layout.logout') }}
  .layout__overlay(v-if="sidebarOpen" @click="sidebarOpen = false")
  .main
    header.topbar
      button.topbar__menu(@click="sidebarOpen = true" :aria-label="t('layout.openMenu')")
        i.ti.ti-menu-2
      .topbar__crumb
        span.topbar__cur {{ t('brand.name') }}
        span.topbar__sep ›
        span.topbar__cur Manta Vision
      .topbar__actions
        button.topbar__tasks(@click="taskPanelOpen = !taskPanelOpen")
          span.topbar__tasksIcon
            IconTasksBadge
          | {{ t('layout.tasks') }}
          span.topbar__tasksBadge(v-if="unreadCount > 0") {{ unreadCount }}
          span.topbar__tasksDot(v-else-if="activeCount > 0")
        FeedBadge
        .topbar__user
          span.topbar__userDot
          span {{ t('layout.owner', { name: 'Mavis' }) }}
    main.content
      .content__inner
        router-view
  TaskCenterPanel(v-model:open="taskPanelOpen")
  GenerationToast
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import FeedBadge from '@/components/FeedBadge.vue'
import TaskCenterPanel from '@/components/TaskCenterPanel.vue'
import GenerationToast from '@/components/GenerationToast.vue'
import IconTasksBadge from '@/components/icons/IconTasksBadge.vue'
import IconAiSparkle from '@/components/icons/IconAiSparkle.vue'
import IconLibraryPhoto from '@/components/icons/IconLibraryPhoto.vue'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import IconSettings from '@/components/icons/IconSettings.vue'
import { useGenerationTasksStore } from '@/stores/generationTasks'

const route = useRoute()
const { t } = useI18n()
const taskPanelOpen = ref(false)
const sidebarOpen = ref(false)
watch(
  () => route.path,
  () => (sidebarOpen.value = false), // 換頁自動收起手機抽屜
)
const { activeCount, unreadCount } = storeToRefs(useGenerationTasksStore())
const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const navItems = computed(() => [
  { label: t('nav.workbench'), icon: IconAiSparkle, to: '/' },
  { label: t('nav.library'), icon: IconLibraryPhoto, to: '/library' },
  { label: t('nav.usage'), icon: IconFeedBottleSmall, to: '/usage' },
  { label: t('nav.settings'), icon: IconSettings, to: '/settings' },
])
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
  gap: 0.125rem;
  &__logo {
    font-size: 1.125rem;
    font-weight: 700;
    padding: 0.25rem 0;
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
      line-height: 1.375;
      color: $blue-dark-300;
    }
    small {
      color: #606692;
      font-size: 0.875rem;
      font-weight: 400;
      line-height: 1.4286;
    }
  }
  &__nav {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.375rem;
  }
  &__item {
    @include flex(flex-start, center, 0.5rem);
    margin: 0 -1rem;
    padding: 0.8125rem 0.75rem;
    // border-radius: 8px;
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.85);
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    &.isActive {
      background: $blue-light;
      color: $blue-dark-500;
      font-weight: 700;
      position: relative;
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 1.25rem;
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
    gap: 0.9375rem;
    padding: 0.9375rem 0;
  }
  &__footerLink {
    color: rgba(255, 255, 255, 0.35);
    font-size: 0.8125rem;
    padding: 0.375rem 0;
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
  }
  &__user {
    @include flex(flex-start, center, 0.5rem);
    font-size: 0.875rem;
    color: #606692;
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
    padding: 0.5625rem 0.75rem;
    border: none;
    border-radius: 18px;
    background: $blue-light;
    color: $blue-dark-500;
    font-size: 0.875rem;
    font-weight: 500;
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
  @include below($bp-md) {
    display: flex;
  }
}
.layout__overlay {
  display: none;
  @include below($bp-md) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(23, 30, 82, 0.4);
  }
}
@include below($bp-md) {
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
  .content {
    padding: 1.25rem 1rem;
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
  .topbar__user span:last-child {
    display: none;
  }
}
</style>
