<template lang="pug">
Teleport(to="body")
  .taskpanelCatcher(v-if="open" @click="close")
  .taskpanel#generation-task-panel(v-if="open" ref="dialogRef" role="dialog" aria-modal="true" aria-labelledby="task-panel-title" tabindex="-1")
    .taskpanel__head
      span#task-panel-title.taskpanel__title {{ t('taskCenter.title') }}
      button.taskpanel__markall(@click="tasksStore.markAllRead()") {{ t('taskCenter.markAllRead') }}
      button.taskpanel__close(data-dialog-initial-focus @click="close" :aria-label="t('common.close')")
        IconClose
    .taskpanel__empty(v-if="!tasks.length" role="status") {{ t('taskCenter.empty') }}
    .taskpanel__list(v-else)
      .task(v-for="task in tasks" :key="task.id" :class="`task--${task.status}`")
        .task__thumb
          component(:is="task.kind === 'video' ? IconPlayCircle : IconImagePlaceholder")
        .task__body
          template(v-if="task.status === 'pending' || task.status === 'processing'")
            .task__topline
              span.task__dot.task__dot--running
              span.task__name {{ task.name }}
              //- 圖生圖沒有真的進度（固定 60%），推算出來的秒數會一直停在「剩 58 秒」
              span.task__eta(v-if="task.kind === 'video'") {{ remainingTime(task) }}
            .task__progressRow
              .task__bar(role="progressbar" :aria-label="task.name" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="task.progress")
                .task__barFill(:style="{ width: task.progress + '%' }")
              span.task__progress {{ task.progress }}%
          template(v-else-if="task.status === 'done'")
            .task__topline
              span.task__dot.task__dot--done
              span.task__name {{ task.name }}
            //- 只有影片會自動入庫；其餘（圖生圖、行銷、試穿、修圖）後端 save_result 要按了才存，不能說「已存入圖庫」
            p.task__meta(v-if="task.kind === 'video'") {{ $t('taskCenter.completed', { type: $t(`assetTypes.${task.kind}`) }) }}
            p.task__meta(v-else) {{ $t(`taskCenter.${task.kind}Completed`) }}
          template(v-else)
            .task__topline
              span.task__dot.task__dot--failed
              span.task__name {{ task.name }}
            p.task__meta.task__meta--failed(:title="task.error || $t('taskCenter.failedDetail')") {{ task.error || $t('taskCenter.failedDetail') }}
        .task__action
          button(v-if="task.status === 'done' && task.kind === 'video'" @click="view") {{ $t('common.view') }}
          //- 只有影片能從面板重試（retryTask 只處理影片）：其餘任務的結果只活在各自頁面，面板重做會扣點卻看不到結果。
          //- 重新整理後還原的影片沒有原始參數（videoReq），按了也沒作用，不給鈕
          button(v-else-if="task.status === 'failed' && task.kind === 'video' && task.videoReq" @click="tasksStore.retryTask(task.id)") {{ $t('common.retry') }}
    .taskpanel__foot
      p {{ t('taskCenter.notePrimary') }}
      p {{ t('taskCenter.notePolicy') }}
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'
import { IconClose, IconImagePlaceholder, IconPlayCircle } from '@/components/icons'
import type { GenerationTask, GenerationTaskKind } from '@/types/api'

const open = defineModel<boolean>('open', { required: true })
const dialogRef = ref<HTMLElement | null>(null)

const tasksStore = useGenerationTasksStore()
const { tasks } = storeToRefs(tasksStore)
const router = useRouter()
const { t } = useI18n()

const close = () => (open.value = false)
useAccessibleDialog(open, dialogRef, close)
// 後端回的 etaSeconds 優先；沒有（pending 前的瞬間、mock）才用進度推估
const remainingTime = (task: GenerationTask) => {
  const totalSeconds = task.etaSeconds ?? Math.max(0, Math.round(((100 - task.progress) / 100) * 145))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return minutes ? t('common.remainingMinutesSeconds', { minutes, seconds }) : t('common.remainingSeconds', { seconds })
}
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
  display: flex;
  width: 22.5rem;
  flex-direction: column;
  max-width: calc(100vw - 3rem);
  max-height: 70vh;
  background: $white;
  overflow: hidden;
  border: 1px solid $gray;
  border-radius: 12px;
  box-shadow: 0 8px 12px rgba($black, 0.14);

  &__head {
    @include flex(space-between, center, 0.5rem);
    flex-shrink: 0;
    padding: 1rem 1rem 0.75rem;
  }

  &__title {
    color: $blue-dark-500;
    font-size: 1rem;
    font-weight: 700;
    line-height: normal;
  }

  &__markall {
    margin-left: auto;
    color: #606692;
    font-size: 0.75rem;
    line-height: normal;
  }

  &__close {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }

  &__empty {
    padding: 1.5rem 1rem;
    color: $gray-100;
    font-size: 0.875rem;
    text-align: center;
  }

  &__list {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 0.375rem;
    overflow-y: auto;
    padding: 0 1rem;
  }

  &__foot {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0;
    padding: 0.875rem 1rem 1rem;
    border-top: 1px solid $gray;
    color: #606692;
    font-size: 0.75rem;
    line-height: normal;
  }
}

// 列表是會捲動的直向 flex：不加 flex-shrink: 0 的話任務多時每列被壓回 min-height，較長的說明會疊到下一列
.task {
  @include flex(flex-start, center, 0.625rem);
  flex-shrink: 0;
  min-height: 3.5rem;
  padding: 0.5rem;
  border-radius: 8px;

  &--pending,
  &--processing {
    background: $blue-light;
  }

  &__thumb {
    @include flex(center, center);
    width: 3.5rem;
    height: 2.5rem;
    flex-shrink: 0;
    border-radius: 8px;
    background: #eef1f7;
    color: #aeb8cc;

    :deep(svg) {
      width: 2rem;
      height: 2rem;
    }
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__topline {
    @include flex(flex-start, center, 0.375rem);
    width: 100%;
  }

  &__name {
    min-width: 0;
    overflow: hidden;
    color: $blue-dark-500;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__eta {
    margin-left: auto;
    color: #606692;
    font-size: 0.75rem;
    line-height: normal;
    white-space: nowrap;
  }

  &__progressRow {
    @include flex(flex-start, center, 0.375rem);
    margin-top: 0.3125rem;
  }

  &__progress {
    flex-shrink: 0;
    color: #606692;
    font-size: 0.75rem;
    line-height: normal;
    font-variant-numeric: tabular-nums;
  }

  &__bar {
    height: 0.375rem;
    flex: 1;
    background: $blue-light;
    border-radius: 3px;
    overflow: hidden;
  }

  &__barFill {
    height: 100%;
    background: $blue-dark-500;
    border-radius: 3px;
    transition: width 0.3s;
  }

  &__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;

    &--running {
      background: #606692;
    }

    &--done {
      background: $green;
    }

    &--failed {
      background: #ff6148;
    }
  }

  &__meta {
    margin-top: 0.3125rem;
    overflow: hidden;
    color: #606692;
    font-size: 0.75rem;
    line-height: normal;
    // 不設行數上限：完成說明的重點在句尾（「請到○○頁按○○」），手機寬度與英文介面兩行放不下，截掉就等於沒說

    &--failed {
      color: #ff6148;
    }
  }

  &__action {
    flex-shrink: 0;

    button {
      color: $blue-dark-500;
      font-size: 0.8125rem;
      font-weight: 500;
      line-height: normal;
    }
  }
}
</style>
