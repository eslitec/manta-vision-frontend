<template lang="pug">
.genimg
  section.panel.genimg__input
    .step
      .step__title {{ t('image.steps.reference') }}
      .dropzone
        i.ti.ti-photo.dropzone__icon
        span.dropzone__name(v-if="refImage") {{ refImage.name }}
      .dropzone__actions
        GhostButton(@click="pickerOpen = true") {{ t('common.selectFromLibrary') }}
        span.dropzone__hint {{ t('common.orDragUpload') }}

    .step
      .step__title {{ t('image.steps.prompt') }}
      textarea.textarea(v-model="prompt" rows="4" :placeholder="t('image.promptPlaceholder')")
      .assist
        button.assist__action(:disabled="assisting || !prompt" @click="assist")
          i.ti(:class="assisting ? 'ti-loader spin' : 'ti-sparkles'")
          span {{ assisting ? t('image.assisting') : t('image.assist') }}
        span.assist__hint {{ t('image.assistHint') }}
      button.advanced(@click="advancedOpen = !advancedOpen")
        span {{ t('image.advancedSettings') }}
        i.ti(:class="advancedOpen ? 'ti-chevron-up' : 'ti-chevron-down'")
      .adv(v-show="advancedOpen")
        .adv__row
          label.adv__label
            span {{ t('image.referenceStrength') }}
            span.adv__val {{ referenceStrength.toFixed(2) }}
          input.adv__range(type="range" min="0" max="1" step="0.05" v-model.number="referenceStrength")
          span.adv__hint {{ t('image.strengthHint') }}{{ refImage ? '' : t('image.referenceRequired') }}
        .adv__row
          label.adv__label {{ t('image.negativePrompt') }}
          input.adv__input(type="text" v-model="negativePrompt" :placeholder="t('image.negativePlaceholder')")
        .adv__row
          label.adv__label {{ t('image.seed') }}
          input.adv__input(type="number" v-model="seedInput" :placeholder="t('image.seedPlaceholder')")

    .step
      .step__head
        span.step__title {{ t('image.steps.model') }}
        span.step__hint {{ t('image.modelHint') }}
      .models
        button.modelcard(v-for="t in imageTiers" :key="t.key" :class="{ 'isActive': imageTier === t.key }" @click="imageTier = t.key")
          .modelcard__header
            span.modelcard__name {{ $t(`modelTiers.${t.key}.label`) }}
            span.modelcard__badge ×{{ t.multiplier }}
          span.modelcard__cost {{ $t('image.feedPerImage', { count: IMAGE_BASE_COST * t.multiplier }) }}
          span.modelcard__desc {{ $t(`image.modelDescriptions.${t.key}`) }}

    BrandToggle.genimg__brand(v-model="applyBrand" @edit="goBrandSettings")

    .count
      span.count__label {{ t('image.count') }}
      button.count__pill(v-for="c in counts" :key="c" :class="{ 'isActive': count === c }" @click="count = c") {{ t('image.imageCount', { count: c }) }}

    p.err(v-if="errorMsg") {{ errorMsg }}

    .genimg__footer
      .cost
        .cost__label {{ t('common.estimatedCost') }}
        .cost__value
          IconFeedBottleSmall.cost__icon
          span {{ t('units.feed', { count: estCost }) }}
      PrimaryButton(:disabled="generating || !prompt" @click="generate")
        i.ti(:class="generating ? 'ti-loader spin' : 'ti-plus'")
        span {{ generating ? t('common.generating') : t('image.generate') }}

  section.panel.genimg__result
    .result__head
      h2.result__title {{ t('common.generationResult') }}
      span.result__hint {{ t('image.resultHint') }}
    .result__empty(v-if="!results.length") {{ t('image.emptyResult') }}
    .result__grid(v-else)
      .result__item(v-for="r in results" :key="r.id")
        .result__thumb
          span.result__badge(v-if="r.adopted") {{ t('image.adopted') }}
          i.ti.ti-photo
        .result__actions
          PrimaryButton(@click="saveToLib(r)") {{ r.savedAssetId ? t('common.saved') : t('common.saveToLibrary') }}
          ChipButton(variant="plain" @click="download(r)") {{ t('common.download') }}
          ChipButton(variant="plain" @click="regen(r)") {{ t('common.regenerate') }}

  ImagePickerDialog(v-model:open="pickerOpen" :title="t('image.pickerTitle')" @select="onPickReference")
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import GhostButton from '@/components/GhostButton.vue'
import ChipButton from '@/components/ChipButton.vue'
import BrandToggle from '@/components/BrandToggle.vue'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
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
const { t } = useI18n()

// 生成模型分級（對齊設計稿：標準×1／進階×1.5／專業×3；以標準 8 顆／張為基準）
const IMAGE_BASE_COST = 8
const imageTiers = [
  { key: 'standard', multiplier: 1 },
  { key: 'advanced', multiplier: 1.5 },
  { key: 'pro', multiplier: 3 },
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
      t('image.taskName', { name: prompt.value.slice(0, 12) || Date.now() }),
      estCost.value,
    )
    await feed.refresh()
  } catch (e: unknown) {
    errorMsg.value = isInsufficientFeed(e) ? t('errors.insufficientFeed') : t('errors.generationFailed')
  } finally {
    generating.value = false
  }
}

async function adopt(r: GeneratedImage) {
  if (r.adopted) return
  await api.recordAdoption()
  r.adopted = true
}
async function download(r: GeneratedImage) {
  await adopt(r) /* TODO: 觸發實際下載 */
}
async function saveToLib(r: GeneratedImage) {
  if (r.savedAssetId) return
  const a = await saveGenerated(t('image.savedName', { id: r.id }))
  r.savedAssetId = a.id
  await adopt(r)
}
async function regen(r: GeneratedImage) {
  const perImage = IMAGE_BASE_COST * tierMultiplier.value
  try {
    const [next] = await tasksStore.createImageTask(
      () => api.generateImages(buildReq(1), perImage),
      t('image.regenerationTaskName'),
      perImage,
    )
    const i = results.value.findIndex((x) => x.id === r.id)
    if (i >= 0 && next) results.value[i] = next
    await feed.refresh()
  } catch {
    errorMsg.value = t('image.regenerationInsufficientFeed')
  }
}
const onPickReference = (a: Asset) => {
  refImage.value = a
}
const goBrandSettings = () => router.push('/settings')
</script>

<style scoped lang="scss">
.genimg {
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
.genimg__input {
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
.modelselect {
  width: 100%;
  height: 2.5rem;
  border: 1px solid $gray;
  border-radius: 10px;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  font-family: inherit;
  color: $blue-dark-300;
  background: $white;
  cursor: pointer;
  outline: none;
  &:focus {
    border-color: $blue;
  }
}
.dropzone {
  @include flex(center, center);
  flex-direction: column;
  aspect-ratio: 352 / 100;
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
  &__actions {
    @include flex(flex-start, center, 0.75rem);
  }
  &__hint {
    font-size: 0.75rem;
    color: #b4b9c4;
  }
}
.textarea {
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 0.875rem;
  font-size: 0.875rem;
  font-family: inherit;
  color: $blue-dark-300;
  resize: vertical;
  outline: none;
  background: $blue-light;
  &::placeholder {
    color: #b4b9c4;
  }
}
.assist {
  @include flex(flex-start, center, 0.625rem);
  margin: 0.75rem 0 1rem;
  &__action {
    @include flex(center, center, 0.375rem);
    background: #f6eac1;
    color: $dark-blue-gray;
    padding: 0.1875rem 0.75rem;
    border-radius: 16px;
    font-size: 0.8125rem;
    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  }
  &__hint {
    font-size: 0.75rem;
    color: #b4b9c4;
  }
}
.advanced {
  @include flex(space-between, center);
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 0 0.75rem;
  height: 1.5rem;
  font-size: 0.875rem;
  color: $dark-blue-gray;
  margin-bottom: 0.75rem;
  background: $blue-light;
}
.adv {
  border: 1px solid $gray;
  border-radius: 10px;
  padding: 0.875rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  &__row {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  &__label {
    @include flex(space-between, center);
    font-size: 0.8125rem;
    color: $blue-dark-300;
  }
  &__val {
    font-size: 0.8125rem;
    font-weight: 700;
    color: $blue;
  }
  &__range {
    width: 100%;
    accent-color: $blue;
    cursor: pointer;
  }
  &__hint {
    font-size: 0.75rem;
    color: $gray-100;
  }
  &__input {
    width: 100%;
    border: 1px solid $gray;
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-family: inherit;
    color: $blue-dark-300;
    outline: none;
    &:focus {
      border-color: $blue;
    }
    &::placeholder {
      color: $gray-100;
    }
  }
}
.count {
  @include flex(flex-start, center, 0.5rem);
  &__label {
    font-size: 0.875rem;
    color: $dark-blue-gray;
  }
  &__pill {
    padding: 0.1875rem 0.75rem;
    border-radius: 16px;
    font-size: 0.8125rem;
    border: 1px solid $gray;
    background: $white;
    color: #606692;
    &.isActive {
      color: $blue-dark-500;
      border-color: $blue-dark-500;
      font-weight: 600;
    }
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
.genimg__brand {
  margin-bottom: 1rem;
}
.err {
  color: $red;
  font-size: 0.8125rem;
  margin-bottom: 0.75rem;
}
.genimg__footer {
  @include flex(space-between, flex-end);
  border-top: 1px solid $gray;
  margin: auto -1.5rem 0;
  padding: 0.875rem 1.5rem 0;
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
    color: $dark-blue-gray;
  }
  &__icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }
}
.result__head {
  @include flex(space-between, center);
  .result__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: $dark-blue-gray;
  }
  .result__hint {
    font-size: 0.75rem;
    color: #b4b9c4;
  }
}
.result__empty {
  color: $gray-100;
  font-size: 0.875rem;
  padding: 2.5rem 0;
  text-align: center;
}
// 結果面板最大寬度：內容區照樣流動填滿，但結果面板封頂，避免超寬螢幕下 2 欄卡片被撐太大（可調整此值）
.genimg__result {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.result__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem 1rem;
  @include below($bp-sm) {
    grid-template-columns: 1fr;
  }
}
.result__thumb {
  @include flex(center, center);
  position: relative;
  aspect-ratio: 311 / 187;
  background: #eef1f7;
  border-radius: 8px;
  color: $babyBlue;
  font-size: 1.875rem;
  margin-bottom: 0.5rem;
}
.linkbtn {
  font-size: 0.875rem;
  color: $blue-dark-500;
  padding: 0.5rem 0.25rem;
  &:hover {
    color: $blue;
  }
}
.result__badge {
  position: absolute;
  top: 0.625rem;
  left: 0.625rem;
  background: $green;
  color: $white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1875rem 0.625rem;
  border-radius: 999px;
}
.result__actions {
  @include flex(flex-start, center, 0.5rem);
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
