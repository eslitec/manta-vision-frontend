<template lang="pug">
.genimg
  section.panel.genimg__input
    .step
      .step__title 1. 參考圖
      .dropzone
        i.ti.ti-photo.dropzone__icon
        span.dropzone__name(v-if="refImage") {{ refImage.name }}
      .dropzone__actions
        GhostButton(@click="pickerOpen = true") 從圖庫選擇
        span.dropzone__hint 或拖曳上傳

    .step
      .step__title 2. 描述你想要的圖片
      textarea.textarea(v-model="prompt" rows="4" placeholder="例：把商品放在木質桌面上，自然光、日系簡約風格…")
      .assist
        button.assist__btn(:disabled="assisting || !prompt" @click="assist")
          i.ti(:class="assisting ? 'ti-loader spin' : 'ti-sparkles'")
          span {{ assisting ? '擴寫中…' : 'AI 輔助描述' }}
        span.assist__hint 把口語需求擴寫成完整 prompt
      button.advanced(@click="advancedOpen = !advancedOpen")
        span 進階設定（參考強度・負面提示・種子）
        i.ti(:class="advancedOpen ? 'ti-chevron-up' : 'ti-chevron-down'")
      .adv(v-show="advancedOpen")
        .adv__row
          label.adv__label
            span 參考強度
            span.adv__val {{ referenceStrength.toFixed(2) }}
          input.adv__range(type="range" min="0" max="1" step="0.05" v-model.number="referenceStrength")
          span.adv__hint 低＝貼近參考圖，高＝更聽描述{{ refImage ? '' : '（需先選參考圖）' }}
        .adv__row
          label.adv__label 負面提示
          input.adv__input(type="text" v-model="negativePrompt" placeholder="不希望出現：模糊、多餘手指、浮水印、文字…")
        .adv__row
          label.adv__label 種子
          input.adv__input(type="number" v-model="seedInput" placeholder="留空＝隨機（固定可重現同一張）")

    .step
      .step__head
        span.step__title 3. 生成模型
        span.step__hint 倍率以標準模型 8 顆／張 為基準
      .models
        button.modelcard(v-for="t in imageTiers" :key="t.key" :class="{ 'is-active': imageTier === t.key }" @click="imageTier = t.key")
          .modelcard__top
            span.modelcard__name {{ t.label }}
            span.modelcard__badge ×{{ t.multiplier }}
          span.modelcard__cost {{ IMAGE_BASE_COST * t.multiplier }} 顆／張
          span.modelcard__desc {{ t.desc }}

    BrandToggle.genimg__brand(v-model="applyBrand" @edit="goBrandSettings")

    .count
      span.count__label 生成張數
      button.count__pill(v-for="c in counts" :key="c" :class="{ 'is-active': count === c }" @click="count = c") {{ c }} 張

    p.err(v-if="errorMsg") {{ errorMsg }}

    .genimg__footer
      .cost
        .cost__label 預估消耗
        .cost__value {{ estCost }} 顆飼料
      PrimaryButton(:disabled="generating || !prompt" @click="generate")
        i.ti(:class="generating ? 'ti-loader spin' : 'ti-plus'")
        span {{ generating ? '生成中…' : '生成圖片' }}

  section.panel.genimg__result
    .result__head
      h2.result__title 生成結果
      span.result__hint 選用的素材會自動存回圖庫並記錄來源鏈
    .result__empty(v-if="!results.length") 生成後結果會顯示在這裡
    .result__grid(v-else)
      .result__item(v-for="r in results" :key="r.id")
        .result__thumb
          span.result__badge(v-if="r.adopted") 已選用
          i.ti.ti-photo
        .result__actions
          OutlineButton(@click="saveToLib(r)") {{ r.savedAssetId ? '已存入' : '存入圖庫' }}
          button.linkbtn(@click="download(r)") 下載
          button.linkbtn(@click="regen(r)") 重生成

  ImagePickerDialog(v-model:open="pickerOpen" title="從圖庫選擇參考圖" @select="onPickReference")
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import GhostButton from '@/components/GhostButton.vue'
import OutlineButton from '@/components/OutlineButton.vue'
import BrandToggle from '@/components/BrandToggle.vue'
import { useRouter } from 'vue-router'
import { useFeedStore } from '@/stores/feed'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import { useAssets } from '@/composables/useAssets'
import { api } from '@/api'
import { isInsufficientFeed } from '@/utils/error'
import type { Asset, GeneratedImage, GenerateImageReq } from '@/types/api'

const feed = useFeedStore()
const tasksStore = useGenerationTasksStore()
const { saveGenerated } = useAssets()
const router = useRouter()

// 生成模型分級（對齊設計稿：標準×1／進階×1.5／專業×3；以標準 8 顆／張為基準）
const IMAGE_BASE_COST = 8
const imageTiers = [
  { key: 'standard', label: '標準', multiplier: 1, desc: '日常用途' },
  { key: 'advanced', label: '進階', multiplier: 1.5, desc: '細節更佳' },
  { key: 'pro', label: '專業', multiplier: 3, desc: '商用印刷' },
]
const imageTier = ref('standard')
const prompt = ref('')
const applyBrand = ref(true)
const advancedOpen = ref(false)
const counts = [2, 4]
const count = ref(2)
const refImage = ref<Asset | null>(null)
const pickerOpen = ref(false)
const generating = ref(false)
const assisting = ref(false)
const errorMsg = ref('')
const results = ref<GeneratedImage[]>([])

// 進階設定
const referenceStrength = ref(0.5)
const negativePrompt = ref('')
const seedInput = ref('')

onMounted(() => {
  if (!feed.loaded) feed.refresh()
})

const tierMultiplier = computed(() => imageTiers.find((t) => t.key === imageTier.value)?.multiplier ?? 1)
const estCost = computed(() => count.value * IMAGE_BASE_COST * tierMultiplier.value)

// AI 輔助描述：呼叫增強器把口語擴寫成結構化 prompt
async function assist() {
  if (!prompt.value || assisting.value) return
  assisting.value = true
  try {
    prompt.value = await api.enhancePrompt(prompt.value)
  } finally {
    assisting.value = false
  }
}

// 組請求（含進階設定；參考強度僅在有參考圖時帶）
function buildReq(n: number): GenerateImageReq {
  return {
    modelId: imageTier.value,
    referenceId: refImage.value?.id,
    prompt: prompt.value,
    count: n,
    referenceStrength: refImage.value ? referenceStrength.value : undefined,
    negativePrompt: negativePrompt.value.trim() || undefined,
    seed: seedInput.value ? Number(seedInput.value) : undefined,
  }
}

async function generate() {
  errorMsg.value = ''
  generating.value = true
  try {
    const perImage = IMAGE_BASE_COST * tierMultiplier.value
    results.value = await tasksStore.createImageTask(
      () => api.generateImages(buildReq(count.value), perImage),
      `圖生圖_${prompt.value.slice(0, 12) || Date.now()}`,
      estCost.value,
    )
    await feed.refresh()
  } catch (e: unknown) {
    errorMsg.value = isInsufficientFeed(e) ? '飼料不足，請先儲值。' : '生成失敗，請再試一次。'
  } finally {
    generating.value = false
  }
}

async function adopt(r: GeneratedImage) {
  if (r.adopted) return
  await api.recordAdoption()
  r.adopted = true
}
async function download(r: GeneratedImage) { await adopt(r) /* TODO: 觸發實際下載 */ }
async function saveToLib(r: GeneratedImage) {
  if (r.savedAssetId) return
  const a = await saveGenerated('圖生圖_' + r.id)
  r.savedAssetId = a.id
  await adopt(r)
}
async function regen(r: GeneratedImage) {
  const perImage = IMAGE_BASE_COST * tierMultiplier.value
  try {
    const [next] = await tasksStore.createImageTask(
      () => api.generateImages(buildReq(1), perImage),
      `圖生圖_重生成`,
      perImage,
    )
    const i = results.value.findIndex((x) => x.id === r.id)
    if (i >= 0 && next) results.value[i] = next
    await feed.refresh()
  } catch { errorMsg.value = '飼料不足，無法重生成。' }
}
const onPickReference = (a: Asset) => { refImage.value = a }
const goBrandSettings = () => router.push('/settings')
</script>

<style scoped lang="scss">
.genimg { display: grid; grid-template-columns: 400px 1fr; gap: 16px; align-items: start; }
.panel { @include card; padding: 24px; }
.step { margin-bottom: 22px;
  &__title { font-size: 15px; font-weight: 700; color: $blue-dark-300; margin-bottom: 12px; } }
.modelselect {
  width: 100%; height: 40px; border: 1px solid $gray; border-radius: 10px; padding: 0 12px;
  font-size: 14px; font-family: inherit; color: $blue-dark-300; background: $white; cursor: pointer; outline: none;
  &:focus { border-color: $blue; } }
.dropzone {
  @include flex(center, center); flex-direction: column;
  aspect-ratio: 4 / 3; border: 1.5px dashed $gray; border-radius: 10px;
  background: $blue-light; color: $babyBlue; font-size: 34px; margin-bottom: 12px;
  &__name { font-size: 13px; color: $gray-400; margin-top: 8px; }
  &__actions { @include flex(flex-start, center, 12px); }
  &__hint { font-size: 12px; color: $gray-100; } }
.textarea {
  width: 100%; border: 1px solid $gray; border-radius: 10px; padding: 12px 14px;
  font-size: 14px; font-family: inherit; color: $blue-dark-300; resize: vertical; outline: none;
  &::placeholder { color: $gray-100; } &:focus { border-color: $blue; } }
.assist { @include flex(flex-start, center, 10px); margin: 12px 0 16px;
  &__btn { @include flex(center, center, 6px); background: $tagYellow; color: #854F0B; font-weight: 600; padding: 5px 12px; border-radius: 999px; font-size: 13px;
    &:disabled { opacity: .45; cursor: not-allowed; } }
  &__hint { font-size: 12px; color: $gray-100; } }
.advanced { @include flex(space-between, center); width: 100%; border: 1px solid $gray; border-radius: 10px; padding: 11px 14px; font-size: 14px; color: $gray-400; margin-bottom: 12px; }
.adv { border: 1px solid $gray; border-radius: 10px; padding: 14px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 14px;
  &__row { display: flex; flex-direction: column; gap: 6px; }
  &__label { @include flex(space-between, center); font-size: 13px; color: $blue-dark-300; }
  &__val { font-size: 13px; font-weight: 700; color: $blue; }
  &__range { width: 100%; accent-color: $blue; cursor: pointer; }
  &__hint { font-size: 12px; color: $gray-100; }
  &__input { width: 100%; border: 1px solid $gray; border-radius: 8px; padding: 8px 12px; font-size: 13px; font-family: inherit; color: $blue-dark-300; outline: none;
    &:focus { border-color: $blue; } &::placeholder { color: $gray-100; } } }
.count { @include flex(flex-start, center, 10px);
  &__label { font-size: 14px; color: $blue-dark-300; }
  &__pill { padding: 5px 14px; border-radius: 999px; font-size: 13px; border: 1px solid $gray; background: $white; color: $gray-400;
    &.is-active { background: $blue-light; color: $blue-dark-300; border-color: $babyBlue; font-weight: 600; } } }
.step__head { @include flex(space-between, center); margin-bottom: 12px; .step__title { margin-bottom: 0; } }
.step__hint { font-size: 12px; color: $gray-100; }
.models { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.modelcard { display: flex; flex-direction: column; gap: 3px; align-items: flex-start; padding: 10px; border: 1px solid $gray; border-radius: 8px; background: $white; text-align: left;
  &__top { @include flex(space-between, center, 6px); width: 100%; }
  &__name { font-size: 14px; font-weight: 500; color: $blue-dark-500; }
  &__badge { flex-shrink: 0; font-size: 11px; font-weight: 700; color: $white; background: $blue-dark-500; padding: 1px 6px; border-radius: 10px; }
  &__cost { font-size: 12px; color: $dark-blue-gray; }
  &__desc { font-size: 11px; color: $gray-100; }
  &.is-active { background: $blue-light; border: 1.5px solid $blue-dark-500; } }
.genimg__brand { margin-bottom: 16px; }
.err { color: $red; font-size: 13px; margin-bottom: 12px; }
.genimg__footer { @include flex(space-between, flex-end); border-top: 1px solid $lightGray; padding-top: 16px; }
.cost { &__label { font-size: 12px; color: $gray-100; } &__value { font-size: 17px; font-weight: 700; color: $blue-dark-300; } }
.result__head { @include flex(space-between, baseline); margin-bottom: 16px;
  .result__title { font-size: 18px; font-weight: 700; color: $blue-dark-300; }
  .result__hint { font-size: 12px; color: $gray-100; } }
.result__empty { color: $gray-100; font-size: 14px; padding: 40px 0; text-align: center; }
.result__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.result__thumb { @include flex(center, center); position: relative; aspect-ratio: 311 / 187; background: $blue-light; border-radius: 10px; color: $babyBlue; font-size: 30px; margin-bottom: 10px; }
.linkbtn { font-size: 14px; color: $blue-dark-500; padding: 8px 4px; &:hover { color: $blue; } }
.result__badge { position: absolute; top: 10px; left: 10px; background: $green; color: $white; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; }
.result__actions { @include flex(flex-start, center, 8px); }
.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
</style>
