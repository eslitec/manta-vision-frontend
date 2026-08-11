<template lang="pug">
.video
  section.panel.video__input
    .step
      .step__title {{ t('video.steps.source') }}
      .dropzone
        i.ti.ti-photo.dropzone__icon
        span.dropzone__name(v-if="sourceImage") {{ sourceImage.name }}
      OutlineButton.dropzone__pick(@click="pickerOpen = true") {{ t('common.selectFromLibrary') }}
    .step
      .step__title {{ t('video.steps.template') }}
      .templates
        button.tpl(v-for="item in templates" :key="item.key" :class="{ 'isActive': template === item.key }" @click="template = item.key")
          .tpl__thumb
            i.ti.ti-player-play
          span.tpl__label {{ item.name }}
    .step
      .step__title {{ t('video.steps.ratio') }}
      .ratios
        button.ratio(v-for="r in ratios" :key="r" :class="{ 'isActive': ratio === r }" @click="ratio = r") {{ r }}
    .step
      .step__head
        span.step__title {{ t('video.steps.model') }}
        span.step__hint {{ t('video.modelHint') }}
      .models
        button.modelcard(v-for="t in modelTiers" :key="t.key" :class="{ 'isActive': modelTier === t.key }" @click="modelTier = t.key")
          .modelcard__header
            span.modelcard__name {{ $t(`modelTiers.${t.key}.label`) }}
            span.modelcard__badge ×{{ t.multiplier }}
          span.modelcard__cost {{ $t('units.feedPerVideo', { count: 45 * t.multiplier }) }}
          span.modelcard__desc {{ $t(`video.modelDescriptions.${t.key}`) }}
    .video__sticky
      p.warn
        i.ti.ti-alert-triangle
        span {{ t('video.highCostWarning') }}
      p.err(v-if="errorMsg") {{ errorMsg }}
      .video__footer
        .cost
          .cost__label {{ t('common.estimatedCost') }}
          .cost__value
            IconFeedBottleSmall.cost__icon
            span {{ t('units.feed', { count: estCost }) }}
        PrimaryButton(:disabled="busy" @click="confirmOpen = true")
          i.ti.ti-plus
          span {{ t('video.generate') }}

  section.panel.video__preview
    h2.preview__title {{ previewTitle }}
    .preview__box
      template(v-if="myTask?.status === 'failed'")
        i.ti.ti-alert-triangle
        span.preview__hint {{ myTask.error === 'MODEL_TIMEOUT' ? t('video.timeoutRefund') : t('common.generationFailed') }}
      template(v-else)
        i.ti.ti-player-play
        span.preview__hint(v-if="!myTask") {{ t('video.previewHint') }}

    //- 生成中：進度狀態區塊（對齊設計稿 MV-04c）
    .taskstat(v-if="busy")
      .taskstat__head
        span.taskstat__dot
        span.taskstat__label {{ statusLabel }}
      .taskstat__bar
        .taskstat__fill(:style="{ width: (myTask?.progress ?? 0) + '%' }")
      .taskstat__meta
        span.taskstat__pct {{ myTask?.progress ?? 0 }}%
        span.taskstat__eta(v-if="etaText") {{ etaText }}
      p.taskstat__note {{ t('video.backgroundNote') }}
      OutlineButton.taskstat__cancel(@click="cancelCurrent") {{ t('video.cancelTask') }}
    template(v-if="myTask?.status === 'done'")
      p.result__meta
        span.result__dot
        span {{ t('video.completed') }}
      .result__actions
        OutlineButton(@click="download") {{ t('common.download') }}
        OutlineButton(@click="startGenerate") {{ t('common.regenerate') }}
        PrimaryButton(@click="goLibrary") {{ t('common.openLibrary') }}
      p.result__stat {{ t('video.resultStats', { cost: myTask.cost, elapsed: elapsedText(myTask) }) }}

  ImagePickerDialog(v-model:open="pickerOpen" :title="t('video.pickerTitle')" @select="onPick")
  ConfirmGenerateDialog(v-model:open="confirmOpen" :cost="estCost" :model-label="modelLabelText" @confirm="startGenerate")
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import ConfirmGenerateDialog from '@/components/ConfirmGenerateDialog.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import OutlineButton from '@/components/OutlineButton.vue'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import { isInsufficientFeed } from '@/utils/error'
import { VIDEO_MODEL_TIERS } from '@/types/api'
import type { Asset, GenerationTask, VideoModelTier } from '@/types/api'

const router = useRouter()
const tasksStore = useGenerationTasksStore()
const { t } = useI18n()

const sourceImage = ref<Asset | null>(null)
const pickerOpen = ref(false)
const confirmOpen = ref(false)
const errorMsg = ref('')
const myTaskId = ref<string | null>(null)

const templates = computed(() => [
  { key: 'cameraMove', name: t('video.templates.cameraMove') },
  { key: 'productSpin', name: t('video.templates.productSpin') },
  { key: 'textEntrance', name: t('video.templates.textEntrance') },
  { key: 'zoomBreathing', name: t('video.templates.zoomBreathing') },
])
const template = ref('cameraMove')
const ratios = ['9:16', '1:1', '16:9']
const ratio = ref('9:16')
const modelTiers = VIDEO_MODEL_TIERS
const modelTier = ref<VideoModelTier>('standard')
const estCost = computed(() => {
  const t = modelTiers.find((x) => x.key === modelTier.value)
  return 45 * (t ? t.multiplier : 1)
})
const modelLabelText = computed(() => {
  const tier = modelTiers.find((x) => x.key === modelTier.value)
  return tier
    ? `${t(`modelTiers.${tier.key}.label`)}（×${tier.multiplier}）・${t('units.feedPerVideo', { count: estCost.value })}`
    : ''
})

// 這頁只呈現「這次瀏覽時自己送出的任務」；任務本身在背景持續追蹤，離開頁面不受影響，
// 完整的任務清單（含離開此頁後仍在跑的任務）另外在頂部工具列的任務中心面板查看。
const myTask = computed(() => tasksStore.tasks.find((t) => t.id === myTaskId.value))
const busy = computed(() => myTask.value?.status === 'queued' || myTask.value?.status === 'processing')

const previewTitle = computed(() =>
  myTask.value?.status === 'done'
    ? t('video.previewDone')
    : busy.value
      ? t('video.previewProcessing')
      : t('video.preview'),
)

// 生成階段（步驟 1~4）由進度粗估；真實後端就緒後改用後端回傳的實際階段
const GEN_PHASES = ['preparing', 'rendering', 'compositing', 'finishing'] as const
const genStep = computed(() => {
  const p = myTask.value?.progress ?? 0
  return p < 35 ? 1 : p < 65 ? 2 : p < 90 ? 3 : 4
})
const statusLabel = computed(() =>
  myTask.value?.status === 'queued'
    ? t('taskCenter.queued')
    : t('video.processingStep', {
        step: genStep.value,
        phase: t(`video.phases.${GEN_PHASES[genStep.value - 1]}`),
      }),
)
// 剩餘時間估算：以總長約 110 秒推估（mock）；後端就緒後改用真實 ETA
const etaText = computed(() => {
  if (myTask.value?.status !== 'processing') return ''
  const remain = Math.max(5, Math.round(((100 - (myTask.value.progress ?? 0)) / 100) * 110))
  const m = Math.floor(remain / 60)
  const s = remain % 60
  return m > 0
    ? t('common.remainingMinutesSeconds', { minutes: m, seconds: String(s).padStart(2, '0') })
    : t('common.remainingSeconds', { seconds: s })
})
function cancelCurrent() {
  if (myTask.value) tasksStore.cancelTask(myTask.value.id)
}

const onPick = (a: Asset) => {
  sourceImage.value = a
}

async function startGenerate() {
  errorMsg.value = ''
  try {
    const id = await tasksStore.createVideoTask(
      {
        sourceImageId: sourceImage.value?.id,
        template: template.value,
        ratio: ratio.value,
        modelTier: modelTier.value,
      },
      t('video.taskName', { template: t(`video.templates.${template.value}`) }),
    )
    myTaskId.value = id
  } catch (e: unknown) {
    errorMsg.value = isInsufficientFeed(e) ? t('errors.insufficientFeed') : t('errors.submitFailed')
  }
}

function elapsedText(task: GenerationTask) {
  if (!task.doneAt) return ''
  const sec = Math.round((task.doneAt - task.createdAt) / 1000)
  return t('common.minutesSeconds', {
    minutes: Math.floor(sec / 60),
    seconds: String(sec % 60).padStart(2, '0'),
  })
}
function download() {
  /* TODO: VideoJob 目前只有 mock:// 假 URL，等後端提供真實檔案來源後再接上真正的下載行為 */
}
function goLibrary() {
  router.push('/library')
}
</script>

<style scoped lang="scss">
.video {
  display: grid;
  grid-template-columns: 25rem 1fr;
  gap: 1rem;
  align-items: stretch;
  min-height: 100%;
  @include below($bp-lg) {
    grid-template-columns: 1fr;
  }
}
.panel {
  background: $white;
  border-radius: 10px;
  box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2);
  padding: 1.5rem;
}
.video__input {
  display: flex;
  flex-direction: column;
}
.video__preview {
  display: flex;
  flex-direction: column;
}
.step {
  margin-bottom: 1rem;
  &__title {
    font-size: 1rem;
    font-weight: 700;
    color: $dark-blue-gray;
    margin-bottom: 0.75rem;
  }
}
.dropzone {
  @include flex(center, center);
  flex-direction: column;
  aspect-ratio: 352 / 170;
  border-radius: 8px;
  background: #eef1f7;
  color: $babyBlue;
  font-size: 2.125rem;
  margin-bottom: 0.75rem;
  &__name {
    font-size: 0.8125rem;
    color: $gray-400;
    margin-top: 0.5rem;
  }
}
.dropzone__pick {
  width: 100%;
}
.templates {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
.tpl {
  padding: 0.5rem;
  border: 1px solid $gray;
  border-radius: 8px;
  background: $white;
  text-align: center;
  &__thumb {
    @include flex(center, center);
    aspect-ratio: 148 / 72;
    background: #eef1f7;
    border-radius: 6px;
    color: $babyBlue;
    font-size: 1.375rem;
    margin-bottom: 0.375rem;
  }
  &__label {
    display: block;
    font-size: 0.875rem;
    color: $dark-blue-gray;
    font-weight: 400;
  }
  &.isActive {
    background: $blue-light;
    border: 1.5px solid $blue-dark-500;
    .tpl__label {
      color: $blue-dark-500;
      font-weight: 700;
    }
  }
}
.ratios {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}
.ratio {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 2.375rem;
  padding: 0.5rem 0.625rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  border: 1px solid $gray;
  background: $white;
  color: $dark-blue-gray;
  &.isActive {
    background: $blue-light;
    color: $blue-dark-500;
    border: 1.5px solid $blue-dark-500;
  }
}
.step__head {
  @include flex(space-between, center);
  margin-bottom: 0.75rem;
  .step__title {
    margin-bottom: 0;
    font-size: 0.875rem;
    font-weight: 500;
  }
}
.step__hint {
  font-size: 0.6875rem;
  color: #b4b9c4;
}
.models {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}
.modelcard {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  align-items: flex-start;
  padding: 0.625rem;
  border: 1px solid $gray;
  border-radius: 8px;
  background: $white;
  text-align: left;
  &__header {
    @include flex(space-between, center, 0.375rem);
    width: 100%;
  }
  &__name {
    font-size: 0.875rem;
    font-weight: 500;
    color: $dark-blue-gray;
  }
  &__badge {
    flex-shrink: 0;
    font-size: 0.6875rem;
    font-weight: 700;
    color: #606692;
    background: $blue-light;
    padding: 0.0625rem 0.375rem;
    border-radius: 10px;
  }
  &__cost {
    font-size: 0.75rem;
    font-weight: 500;
    color: $dark-blue-gray;
  }
  &__desc {
    font-size: 0.6875rem;
    color: #b4b9c4;
  }
  &.isActive {
    background: $blue-light;
    border: 1.5px solid $blue-dark-500;
    .modelcard__name {
      color: $blue-dark-500;
    }
    .modelcard__badge {
      background: $blue-dark-500;
      color: $white;
    }
  }
}
.warn {
  @include flex(flex-start, center, 0.625rem);
  background: $blue-light;
  border-left: 3px solid $yellow;
  border-radius: 8px;
  padding: 0.75rem 0.875rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: $dark-blue-gray;
  line-height: 1.4;
  margin: 0;
  i {
    flex-shrink: 0;
    font-size: 1.25rem;
    color: $orange;
  }
}
.err {
  color: $red;
  font-size: 0.8125rem;
}
.video__sticky {
  margin: auto -1.5rem -1.5rem;
  padding: 0.875rem 1.5rem 1.5rem;
  border-top: 1px solid $gray;
  display: flex;
  flex-direction: column;
  gap: 0.6875rem;
}
.video__footer {
  @include flex(space-between, flex-end);
  margin: 0;
}
.cost {
  &__label {
    font-size: 0.75rem;
    color: #b4b9c4;
  }
  &__value {
    @include flex(flex-start, center, 0.25rem);
    font-size: 1rem;
    font-weight: 700;
    color: $orange;
  }
  &__icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }
}
.preview__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: $dark-blue-gray;
  margin-bottom: 1rem;
}
.preview__box {
  @include flex(center, center);
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  min-height: 20rem;
  background: $blue-light;
  border-radius: 12px;
  color: $babyBlue;
  font-size: 2.5rem;
}
.preview__hint {
  font-size: 0.8125rem;
  color: $gray-400;
}
.taskstat {
  max-width: 22.5rem;
  margin: 1rem auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  &__head {
    @include flex(center, center, 0.5rem);
  }
  &__dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 4px;
    background: #606692;
    flex-shrink: 0;
  }
  &__label {
    font-size: 1rem;
    font-weight: 700;
    color: $blue-dark-500;
  }
  &__bar {
    width: 100%;
    height: 0.375rem;
    background: $blue-light;
    border-radius: 3px;
    overflow: hidden;
  }
  &__fill {
    height: 100%;
    background: $blue-dark-500;
    border-radius: 3px;
    transition: width 0.3s;
  }
  &__meta {
    @include flex(flex-start, center);
    width: 100%;
  }
  &__pct {
    font-size: 0.8125rem;
    font-weight: 500;
    color: $blue-dark-500;
  }
  &__eta {
    margin-left: auto;
    font-size: 0.8125rem;
    color: #606692;
  }
  &__note {
    font-size: 0.75rem;
    color: #606692;
    text-align: center;
    line-height: 1.5;
  }
  &__cancel {
    margin-top: 0.125rem;
  }
}
.preview__spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.result__meta {
  @include flex(center, center, 0.5rem);
  font-size: 0.8125rem;
  color: $blue-dark-300;
  margin-top: 0.75rem;
}
.result__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: $green;
}
.result__actions {
  @include flex(center, center, 0.625rem);
  margin-top: 0.75rem;
}
.result__stat {
  text-align: center;
  font-size: 0.75rem;
  color: $gray-100;
  margin-top: 0.5rem;
}
</style>
