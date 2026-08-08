<template lang="pug">
Teleport(to="body")
  .taskpanel-catcher(v-if="open" @click="close")
  .taskpanel(v-if="open")
    .taskpanel__head
      span.taskpanel__title 生成任務
      button.taskpanel__markall(@click="tasksStore.markAllRead()") 全部標為已讀
    .taskpanel__empty(v-if="!tasks.length") 目前沒有生成任務
    .taskpanel__list(v-else)
      .task(v-for="t in tasks" :key="t.id")
        .task__thumb
          i.ti(:class="t.kind === 'video' ? 'ti-player-play' : 'ti-photo'")
        .task__body
          .task__name {{ t.name }}
          template(v-if="t.status === 'queued' || t.status === 'processing'")
            .task__row {{ t.status === 'queued' ? '排隊中…' : '生成中…約 1–2 分鐘' }}
            .task__bar
              .task__bar-fill(:style="{ width: t.progress + '%' }")
          template(v-else-if="t.status === 'done'")
            .task__row
              span.task__dot.task__dot--done
              span 已完成・已存入圖庫›{{ t.kind === 'video' ? '影片' : '圖片' }}
          template(v-else)
            .task__row
              span.task__dot.task__dot--failed
              span {{ t.error === 'MODEL_TIMEOUT' ? `生成失敗・模型逾時，已退還 ${t.cost} 顆` : '生成失敗' }}
        .task__action
          button(v-if="t.status === 'queued' || t.status === 'processing'" @click="tasksStore.cancelTask(t.id)") 取消
          button(v-else-if="t.status === 'done'" @click="view") 查看
          button(v-else @click="tasksStore.retryTask(t.id)") 重試
    p.taskpanel__note 完成的影片會自動存入圖庫›影片，離開頁面不影響生成。系統或模型錯誤導致的失敗全額退還飼料；素材不符規範而中止則不退還。
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import { storeToRefs } from 'pinia'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const tasksStore = useGenerationTasksStore()
const { tasks } = storeToRefs(tasksStore)
const router = useRouter()

const close = () => emit('update:open', false)
const view = () => {
  router.push('/library')
  close()
}
</script>

<style scoped lang="scss">
.taskpanel-catcher { position: fixed; inset: 0; z-index: 999; background: transparent; }
.taskpanel {
  position: fixed; top: 70px; right: 24px; z-index: 1000; width: 460px; max-width: calc(100vw - 48px);
  max-height: 70vh; overflow-y: auto; background: $white; border-radius: 16px; box-shadow: $boxShadowDark; padding: 18px;
}
.taskpanel__head { @include flex(space-between, center); margin-bottom: 12px; }
.taskpanel__title { font-size: 16px; font-weight: 700; color: $blue-dark-300; }
.taskpanel__markall { font-size: 13px; color: $blue; }
.taskpanel__empty { color: $gray-100; font-size: 14px; text-align: center; padding: 24px 0; }
.taskpanel__list { display: flex; flex-direction: column; gap: 12px; }
.task {
  @include flex(flex-start, flex-start, 10px); border-bottom: 1px solid $lightGray; padding-bottom: 12px;
  &:last-child { border-bottom: none; padding-bottom: 0; }
  &__thumb { @include flex(center, center); width: 40px; height: 40px; flex-shrink: 0; border-radius: 8px; background: $blue-light; color: $babyBlue; font-size: 18px; }
  &__body { flex: 1; min-width: 0; }
  &__name { font-size: 14px; font-weight: 600; color: $blue-dark-300; margin-bottom: 4px; }
  &__row { @include flex(flex-start, center, 6px); font-size: 12.5px; color: $gray-400; }
  &__bar { height: 4px; background: $lightGray; border-radius: 999px; margin-top: 6px; overflow: hidden; }
  &__bar-fill { height: 100%; background: $blue; border-radius: 999px; transition: width 0.3s; }
  &__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    &--done { background: $green; } &--failed { background: $red; } }
  &__action { flex-shrink: 0; padding-top: 2px;
    button { font-size: 13px; color: $blue; } }
}
.taskpanel__note { font-size: 11.5px; color: $gray-100; line-height: 1.6; margin-top: 14px; padding-top: 12px; border-top: 1px solid $lightGray; }
</style>
