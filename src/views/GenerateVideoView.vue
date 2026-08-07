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
    p.warn
      i.ti.ti-alert-triangle
      span 影片生成 飼料消耗較高，生成前會再次確認
    p.err(v-if="errorMsg") {{ errorMsg }}
    .video__footer
      .cost
        .cost__label 預估消耗
        .cost__value 45 顆飼料
      PrimaryButton(:disabled="busy" @click="confirmOpen = true")
        i.ti.ti-plus
        span 生成影片

  section.panel.video__preview
    h2.preview__title 預覽
    .preview__box
      template(v-if="status === 'queued' || status === 'processing'")
        i.ti.ti-loader.preview__spin
        span.preview__hint {{ status === 'queued' ? '排隊中…' : '生成中…約 1–2 分鐘，完成會通知' }}
      template(v-else-if="status === 'done'")
        i.ti.ti-circle-check
        span.preview__hint 影片已完成
      template(v-else)
        i.ti.ti-player-play
        span.preview__hint 設定好左側選項後按「生成影片」

  ImagePickerDialog(v-model:open="pickerOpen" title="選擇來源圖片" @select="onPick")
  ConfirmGenerateDialog(v-model:open="confirmOpen" :cost="45" @confirm="startGenerate")
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import ConfirmGenerateDialog from '@/components/ConfirmGenerateDialog.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import OutlineButton from '@/components/OutlineButton.vue'
import { useFeedStore } from '@/stores/feed'
import { api } from '@/api'
import { isInsufficientFeed } from '@/utils/error'
import type { Asset, JobStatus } from '@/types/api'

const feed = useFeedStore()

const sourceImage = ref<Asset | null>(null)
const pickerOpen = ref(false)
const confirmOpen = ref(false)
const status = ref<JobStatus | 'idle'>('idle')
const errorMsg = ref('')
let timer: number | undefined
let jobCost = 45

const templates = [
  { name: '鏡頭推移' },
  { name: '商品旋轉' },
  { name: '文字進場' },
  { name: '縮放呼吸' },
]
const template = ref('鏡頭推移')
const ratios = ['9:16', '1:1', '16:9']
const ratio = ref('9:16')
const busy = computed(() => status.value === 'queued' || status.value === 'processing')

const onPick = (a: Asset) => { sourceImage.value = a }

async function startGenerate() {
  errorMsg.value = ''
  clear() // 送新任務前先停掉上一個輪詢，避免退錯金額
  try {
    const job = await api.createVideoJob({ sourceImageId: sourceImage.value?.id, template: template.value, ratio: ratio.value })
    jobCost = job.cost
    status.value = job.status
    await feed.refresh()
    poll(job.id)
  } catch (e: unknown) {
    errorMsg.value = isInsufficientFeed(e) ? '飼料不足，請先儲值。' : '送出失敗，請再試一次。'
  }
}

function poll(id: string) {
  clear()
  timer = window.setInterval(async () => {
    const j = await api.getVideoJob(id)
    status.value = j.status
    if (j.status === 'done') {
      clear()
      // TODO: 推播完成通知到通知中心
    } else if (j.status === 'failed') {
      clear()
      await api.refundFeed(jobCost) // 失敗退點
      await feed.refresh()
      errorMsg.value = '生成失敗，已退還飼料。'
      status.value = 'idle'
    }
  }, 1000)
}
function clear() { if (timer) { clearInterval(timer); timer = undefined } }
onUnmounted(clear)
</script>

<style scoped lang="scss">
.video { display: grid; grid-template-columns: 380px 1fr; gap: 20px; align-items: stretch; }
.panel { @include card; padding: 22px; }
.video__input { align-self: start; }
.video__preview { display: flex; flex-direction: column; }
.step { margin-bottom: 20px; &__title { font-size: 15px; font-weight: 700; color: $blue-dark-300; margin-bottom: 12px; } }
.dropzone { @include flex(center, center); flex-direction: column; aspect-ratio: 4 / 3; border: 1.5px dashed $gray; border-radius: 10px; background: $blue-light; color: $babyBlue; font-size: 34px; margin-bottom: 12px;
  &__name { font-size: 13px; color: $gray-400; margin-top: 8px; } }
.dropzone__pick { width: 100%; }
.templates { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.tpl { padding: 8px; border: 1px solid $gray; border-radius: 10px; background: $white; text-align: center;
  &__thumb { @include flex(center, center); aspect-ratio: 2 / 1; background: $blue-light; border-radius: 8px; color: $babyBlue; font-size: 22px; margin-bottom: 8px; }
  &__label { display: block; font-size: 13px; color: $gray-400; font-weight: 500; }
  &.is-active {
    border-color: $blue-dark-300;
    .tpl__label { color: $blue-dark-300; font-weight: 700; }
  } }
.ratios { @include flex(flex-start, center, 8px); }
.ratio { padding: 7px 16px; border-radius: 999px; font-size: 14px; border: 1px solid $gray; background: $white; color: $gray-400;
  &.is-active { background: $white; color: $blue-dark-300; border-color: $blue-dark-300; font-weight: 600; } }
.warn { @include flex(flex-start, flex-start, 8px); background: #FAEEDA; color: #854F0B; border-radius: 10px; padding: 10px 12px; font-size: 12.5px; line-height: 1.5; margin: 4px 0 12px; i { flex-shrink: 0; margin-top: 1px; } }
.err { color: $red; font-size: 13px; margin-bottom: 12px; }
.video__footer { @include flex(space-between, flex-end); border-top: 1px solid $lightGray; padding-top: 16px; }
.cost { &__label { font-size: 12px; color: $gray-100; } &__value { font-size: 17px; font-weight: 700; color: $blue-dark-300; } }
.preview__title { font-size: 18px; font-weight: 700; color: $blue-dark-300; margin-bottom: 16px; }
.preview__box { @include flex(center, center); flex-direction: column; gap: 12px; flex: 1; min-height: 320px; background: $blue-light; border-radius: 12px; color: $babyBlue; font-size: 40px; }
.preview__hint { font-size: 13px; color: $gray-400; }
.preview__spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
</style>
