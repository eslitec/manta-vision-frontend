<template lang="pug">
.video
  section.panel.video__input
    .step
      .step__title 1. 選擇來源圖片
      .dropzone
        i.ti.ti-photo.dropzone__icon
        span.dropzone__name(v-if="sourceImage") {{ sourceImage.name }}
      OutlineButton.dropzone__pick(@click="pickerOpen = true") 從圖庫選擇
    .step
      .step__title 2. 選擇動態模板
      .templates
        button.tpl(v-for="t in templates" :key="t.name" :class="{ 'is-active': template === t.name }" @click="template = t.name")
          .tpl__thumb
            i.ti.ti-player-play
          span.tpl__label {{ t.name }}
    .step
      .step__title 3. 輸出比例
      .ratios
        button.ratio(v-for="r in ratios" :key="r" :class="{ 'is-active': ratio === r }" @click="ratio = r") {{ r }}
    .step
      .step__head
        span.step__title 4. 生成模型
        span.step__hint 倍率以標準模型 45 顆/支 為基準
      .models
        button.modelcard(v-for="t in modelTiers" :key="t.key" :class="{ 'is-active': modelTier === t.key }" @click="modelTier = t.key")
          .modelcard__top
            span.modelcard__name {{ t.label }}
            span.modelcard__badge ×{{ t.multiplier }}
          span.modelcard__cost {{ 45 * t.multiplier }} 顆／支
          span.modelcard__desc {{ VIDEO_DESC[t.key] }}
    BrandToggle.video__brand(v-model="applyBrand" @edit="goBrandSettings")
    .video__sticky
      p.warn
        i.ti.ti-alert-triangle
        span 影片生成 飼料消耗較高，生成前會再次確認
      p.err(v-if="errorMsg") {{ errorMsg }}
      .video__footer
        .cost
          .cost__label 預估消耗
          .cost__value
            IconFeedBottleSmall.cost__icon
            span {{ estCost }} 顆飼料
        PrimaryButton(:disabled="busy" @click="confirmOpen = true")
          i.ti.ti-plus
          span 生成影片

  section.panel.video__preview
    h2.preview__title {{ previewTitle }}
    .preview__box
      template(v-if="myTask?.status === 'failed'")
        i.ti.ti-alert-triangle
        span.preview__hint {{ myTask.error === 'MODEL_TIMEOUT' ? '生成失敗・模型逾時，已退還飼料' : '生成失敗' }}
      template(v-else)
        i.ti.ti-player-play
        span.preview__hint(v-if="!myTask") 設定好左側選項後按「生成影片」

    //- 生成中：進度狀態區塊（對齊設計稿 MV-04c）
    .taskstat(v-if="busy")
      .taskstat__head
        span.taskstat__dot
        span.taskstat__label {{ statusLabel }}
      .taskstat__bar
        .taskstat__fill(:style="{ width: (myTask.progress ?? 0) + '%' }")
      .taskstat__meta
        span.taskstat__pct {{ myTask.progress ?? 0 }}%
        span.taskstat__eta(v-if="etaText") {{ etaText }}
      p.taskstat__note 可離開此頁面。完成後會在右上角「任務」通知你，影片自動存入圖庫 › 影片。
      OutlineButton.taskstat__cancel(@click="cancelCurrent") 取消任務
    template(v-if="myTask?.status === 'done'")
      p.result__meta
        span.result__dot
        span 生成完成・已存入圖庫›影片
      .result__actions
        OutlineButton(@click="download") 下載
        OutlineButton(@click="startGenerate") 重新生成
        PrimaryButton(@click="goLibrary") 前往圖庫
      p.result__stat 消耗 {{ myTask.cost }} 顆飼料・耗時 {{ elapsedText(myTask) }}

  ImagePickerDialog(v-model:open="pickerOpen" title="選擇來源圖片" @select="onPick")
  ConfirmGenerateDialog(v-model:open="confirmOpen" :cost="estCost" :model-label="modelLabelText" @confirm="startGenerate")
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import ConfirmGenerateDialog from '@/components/ConfirmGenerateDialog.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import OutlineButton from '@/components/OutlineButton.vue'
import BrandToggle from '@/components/BrandToggle.vue'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import { isInsufficientFeed } from '@/utils/error'
import { VIDEO_MODEL_TIERS } from '@/types/api'
import type { Asset, GenerationTask, VideoModelTier } from '@/types/api'

const router = useRouter()
const tasksStore = useGenerationTasksStore()

const sourceImage = ref<Asset | null>(null)
const pickerOpen = ref(false)
const confirmOpen = ref(false)
const errorMsg = ref('')
const myTaskId = ref<string | null>(null)

const templates = [{ name: '鏡頭推移' }, { name: '商品旋轉' }, { name: '文字進場' }, { name: '縮放呼吸' }]
const template = ref('鏡頭推移')
const ratios = ['9:16', '1:1', '16:9']
const ratio = ref('9:16')
const modelTiers = VIDEO_MODEL_TIERS
const VIDEO_DESC: Record<VideoModelTier, string> = {
  standard: '5 秒・流暢',
  advanced: '10 秒・細緻',
  pro: '10 秒・最高',
}
const modelTier = ref<VideoModelTier>('standard')
const applyBrand = ref(true)
const goBrandSettings = () => router.push('/settings')

const estCost = computed(() => {
  const t = modelTiers.find((x) => x.key === modelTier.value)
  return 45 * (t ? t.multiplier : 1)
})
const modelLabelText = computed(() => {
  const t = modelTiers.find((x) => x.key === modelTier.value)
  return t ? `${t.label}（×${t.multiplier}）・${estCost.value} 顆/支` : ''
})

// 這頁只呈現「這次瀏覽時自己送出的任務」；任務本身在背景持續追蹤，離開頁面不受影響，
// 完整的任務清單（含離開此頁後仍在跑的任務）另外在頂部工具列的任務中心面板查看。
const myTask = computed(() => tasksStore.tasks.find((t) => t.id === myTaskId.value))
const busy = computed(() => myTask.value?.status === 'queued' || myTask.value?.status === 'processing')

const previewTitle = computed(() =>
  myTask.value?.status === 'done' ? '預覽（已完成）' : busy.value ? '預覽（生成中）' : '預覽',
)

// 生成階段（步驟 1~4）由進度粗估；真實後端就緒後改用後端回傳的實際階段
const GEN_PHASES = ['準備素材', '算圖', '合成中', '收尾中']
const genStep = computed(() => {
  const p = myTask.value?.progress ?? 0
  return p < 35 ? 1 : p < 65 ? 2 : p < 90 ? 3 : 4
})
const statusLabel = computed(() =>
  myTask.value?.status === 'queued'
    ? '排隊中…'
    : `生成中（步驟 ${genStep.value}/4：${GEN_PHASES[genStep.value - 1]}）`,
)
// 剩餘時間估算：以總長約 110 秒推估（mock）；後端就緒後改用真實 ETA
const etaText = computed(() => {
  if (myTask.value?.status !== 'processing') return ''
  const remain = Math.max(5, Math.round(((100 - (myTask.value.progress ?? 0)) / 100) * 110))
  const m = Math.floor(remain / 60)
  const s = remain % 60
  return m > 0 ? `約剩 ${m} 分 ${String(s).padStart(2, '0')} 秒` : `約剩 ${s} 秒`
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
      `圖生影_${template.value}`,
    )
    myTaskId.value = id
  } catch (e: unknown) {
    errorMsg.value = isInsufficientFeed(e) ? '飼料不足，請先儲值。' : '送出失敗，請再試一次。'
  }
}

function elapsedText(t: GenerationTask) {
  if (!t.doneAt) return ''
  const sec = Math.round((t.doneAt - t.createdAt) / 1000)
  return `${Math.floor(sec / 60)} 分 ${String(sec % 60).padStart(2, '0')} 秒`
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
  grid-template-columns: 400px 1fr;
  gap: 16px;
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
  padding: 24px;
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
  margin-bottom: 16px;
  &__title {
    font-size: 16px;
    font-weight: 700;
    color: $dark-blue-gray;
    margin-bottom: 12px;
  }
}
.dropzone {
  @include flex(center, center);
  flex-direction: column;
  aspect-ratio: 352 / 170;
  border-radius: 8px;
  background: #eef1f7;
  color: $babyBlue;
  font-size: 34px;
  margin-bottom: 12px;
  &__name {
    font-size: 13px;
    color: $gray-400;
    margin-top: 8px;
  }
}
.dropzone__pick {
  width: 100%;
}
.templates {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.tpl {
  padding: 8px;
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
    font-size: 22px;
    margin-bottom: 6px;
  }
  &__label {
    display: block;
    font-size: 14px;
    color: $dark-blue-gray;
    font-weight: 400;
  }
  &.is-active {
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
  gap: 8px;
}
.ratio {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 38px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  border: 1px solid $gray;
  background: $white;
  color: $dark-blue-gray;
  &.is-active {
    background: $blue-light;
    color: $blue-dark-500;
    border: 1.5px solid $blue-dark-500;
  }
}
.step__head {
  @include flex(space-between, center);
  margin-bottom: 12px;
  .step__title {
    margin-bottom: 0;
    font-size: 14px;
    font-weight: 500;
  }
}
.step__hint {
  font-size: 11px;
  color: #b4b9c4;
}
.models {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.modelcard {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
  padding: 10px;
  border: 1px solid $gray;
  border-radius: 8px;
  background: $white;
  text-align: left;
  &__top {
    @include flex(space-between, center, 6px);
    width: 100%;
  }
  &__name {
    font-size: 14px;
    font-weight: 500;
    color: $dark-blue-gray;
  }
  &__badge {
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    color: #606692;
    background: $blue-light;
    padding: 1px 6px;
    border-radius: 10px;
  }
  &__cost {
    font-size: 12px;
    font-weight: 500;
    color: $dark-blue-gray;
  }
  &__desc {
    font-size: 11px;
    color: #b4b9c4;
  }
  &.is-active {
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
.video__brand {
  margin: 4px 0 16px;
}
.warn {
  @include flex(flex-start, center, 10px);
  background: $blue-light;
  border-left: 3px solid $yellow;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 500;
  color: $dark-blue-gray;
  line-height: 1.4;
  margin: 0;
  i {
    flex-shrink: 0;
    font-size: 20px;
    color: $orange;
  }
}
.err {
  color: $red;
  font-size: 13px;
}
.video__sticky {
  margin: auto -24px -24px;
  padding: 14px 24px 24px;
  border-top: 1px solid $gray;
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.video__footer {
  @include flex(space-between, flex-end);
  margin: 0;
}
.cost {
  &__label {
    font-size: 12px;
    color: #b4b9c4;
  }
  &__value {
    @include flex(flex-start, center, 4px);
    font-size: 16px;
    font-weight: 700;
    color: $orange;
  }
  &__icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}
.preview__title {
  font-size: 18px;
  font-weight: 700;
  color: $dark-blue-gray;
  margin-bottom: 16px;
}
.preview__box {
  @include flex(center, center);
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 320px;
  background: $blue-light;
  border-radius: 12px;
  color: $babyBlue;
  font-size: 40px;
}
.preview__hint {
  font-size: 13px;
  color: $gray-400;
}
.taskstat {
  max-width: 360px;
  margin: 16px auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  &__head {
    @include flex(center, center, 8px);
  }
  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    background: #606692;
    flex-shrink: 0;
  }
  &__label {
    font-size: 16px;
    font-weight: 700;
    color: $blue-dark-500;
  }
  &__bar {
    width: 100%;
    height: 6px;
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
    font-size: 13px;
    font-weight: 500;
    color: $blue-dark-500;
  }
  &__eta {
    margin-left: auto;
    font-size: 13px;
    color: #606692;
  }
  &__note {
    font-size: 12px;
    color: #606692;
    text-align: center;
    line-height: 1.5;
  }
  &__cancel {
    margin-top: 2px;
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
  @include flex(center, center, 8px);
  font-size: 13px;
  color: $blue-dark-300;
  margin-top: 12px;
}
.result__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $green;
}
.result__actions {
  @include flex(center, center, 10px);
  margin-top: 12px;
}
.result__stat {
  text-align: center;
  font-size: 12px;
  color: $gray-100;
  margin-top: 8px;
}
</style>
