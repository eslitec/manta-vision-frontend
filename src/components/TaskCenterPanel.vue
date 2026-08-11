<template lang="pug">
Teleport(to="body")
  .taskpanelCatcher(v-if="open" @click="close")
  .taskpanel(v-if="open")
    .taskpanel__head
      span.taskpanel__title {{ t('taskCenter.title') }}
      button.taskpanel__markall(@click="tasksStore.markAllRead()") {{ t('taskCenter.markAllRead') }}
    .taskpanel__empty(v-if="!tasks.length") {{ t('taskCenter.empty') }}
    .taskpanel__list(v-else)
      .task(v-for="t in tasks" :key="t.id")
        .task__thumb
          i.ti(:class="t.kind === 'video' ? 'ti-player-play' : 'ti-photo'")
        .task__body
          .task__name {{ t.name }}
          template(v-if="t.status === 'queued' || t.status === 'processing'")
            .task__row {{ t.status === 'queued' ? $t('taskCenter.queued') : $t('taskCenter.processing') }}
            .task__bar
              .task__barFill(:style="{ width: t.progress + '%' }")
          template(v-else-if="t.status === 'done'")
            .task__row
              span.task__dot.task__dot--done
              span {{ $t('taskCenter.completed', { type: $t(`assetTypes.${t.kind}`) }) }}
          template(v-else)
            .task__row
              span.task__dot.task__dot--failed
              span {{ t.error === 'MODEL_TIMEOUT' ? $t('taskCenter.timeoutRefund', { cost: t.cost }) : $t('taskCenter.failed') }}
        .task__action
          button(v-if="t.status === 'queued' || t.status === 'processing'" @click="tasksStore.cancelTask(t.id)") {{ $t('common.cancel') }}
          button(v-else-if="t.status === 'done'" @click="view") {{ $t('common.view') }}
          button(v-else @click="tasksStore.retryTask(t.id)") {{ $t('common.retry') }}
    p.taskpanel__note {{ t('taskCenter.note') }}
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const open = defineModel<boolean>('open', { required: true })

const tasksStore = useGenerationTasksStore()
const { tasks } = storeToRefs(tasksStore)
const router = useRouter()
const { t } = useI18n()

const close = () => (open.value = false)
const view = () => {
  router.push('/library')
  close()
}
</script>

<style scoped lang="scss">
.taskpanelCatcher {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: transparent;
}
.taskpanel {
  position: fixed;
  top: 4.375rem;
  right: 1.5rem;
  z-index: 1000;
  width: 28.75rem;
  max-width: calc(100vw - 3rem);
  max-height: 70vh;
  overflow-y: auto;
  background: $white;
  border-radius: 16px;
  box-shadow: $boxShadowDark;
  padding: 1.125rem;
}
.taskpanel__head {
  @include flex(space-between, center);
  margin-bottom: 0.75rem;
}
.taskpanel__title {
  font-size: 1rem;
  font-weight: 700;
  color: $blue-dark-300;
}
.taskpanel__markall {
  font-size: 0.8125rem;
  color: $blue;
}
.taskpanel__empty {
  color: $gray-100;
  font-size: 0.875rem;
  text-align: center;
  padding: 1.5rem 0;
}
.taskpanel__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.task {
  @include flex(flex-start, flex-start, 0.625rem);
  border-bottom: 1px solid $lightGray;
  padding-bottom: 0.75rem;
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  &__thumb {
    @include flex(center, center);
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
    border-radius: 8px;
    background: $blue-light;
    color: $babyBlue;
    font-size: 1.125rem;
  }
  &__body {
    flex: 1;
    min-width: 0;
  }
  &__name {
    font-size: 0.875rem;
    font-weight: 600;
    color: $blue-dark-300;
    margin-bottom: 0.25rem;
  }
  &__row {
    @include flex(flex-start, center, 0.375rem);
    font-size: 0.78125rem;
    color: $gray-400;
  }
  &__bar {
    height: 0.25rem;
    background: $lightGray;
    border-radius: 999px;
    margin-top: 0.375rem;
    overflow: hidden;
  }
  &__barFill {
    height: 100%;
    background: $blue;
    border-radius: 999px;
    transition: width 0.3s;
  }
  &__dot {
    width: 0.4375rem;
    height: 0.4375rem;
    border-radius: 50%;
    flex-shrink: 0;
    &--done {
      background: $green;
    }
    &--failed {
      background: $red;
    }
  }
  &__action {
    flex-shrink: 0;
    padding-top: 0.125rem;
    button {
      font-size: 0.8125rem;
      color: $blue;
    }
  }
}
.taskpanel__note {
  font-size: 0.71875rem;
  color: $gray-100;
  line-height: 1.6;
  margin-top: 0.875rem;
  padding-top: 0.75rem;
  border-top: 1px solid $lightGray;
}
</style>
