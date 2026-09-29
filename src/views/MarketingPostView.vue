<template lang="pug">
.post
  h1.visuallyHidden {{ t('routeTitles.generatePost') }}
  section.panel.post__input
    .step
      .step__title {{ t('marketing.outputType.title') }}
      .outputTypes
        button.outputTypeCard(v-for="o in outputTypeOptions" :key="o.value" :aria-pressed="outputType === o.value" :class="{ isActive: outputType === o.value }" :disabled="typeof o.cost !== 'number'" @click="outputType = o.value")
          span.outputTypeCard__label {{ o.label }}
          span.outputTypeCard__cost
            IconFeedBottleSmall.outputTypeCard__icon
            span {{ t('units.feed', { count: o.cost }) }}
      p.outputTypeHint {{ t('marketing.outputType.hint') }}
    .step
      .step__title {{ t('marketing.steps.image') }}
      .dropzone
        IconImagePlaceholder.dropzone__icon
        span.dropzone__name(v-if="productImage") {{ productImage.name }}
      .dropzone__actions
        AppButton(variant="outline" @click="pickerOpen = true") {{ t('common.selectFromLibrary') }}
    .step
      .step__title {{ t('marketing.steps.intro') }}
      .field(v-if="wantText")
        label.field__label(for="marketing-intro") {{ t('marketing.introLabel') }}
        textarea#marketing-intro.field__input(v-model="intro" maxlength="200" rows="4" :aria-describedby="'marketing-intro-counter'" :placeholder="t('marketing.introPlaceholder')")
        span#marketing-intro-counter.field__counter {{ intro.length }} / 200
      .field(v-if="wantImage")
        label.field__label(for="marketing-poster-text") {{ t('marketing.posterTextLabel') }}
        textarea#marketing-poster-text.field__input(v-model="posterText" maxlength="200" rows="3" :aria-describedby="'marketing-poster-text-counter'" :placeholder="t('marketing.posterTextPlaceholder')")
        span#marketing-poster-text-counter.field__counter {{ posterText.length }} / 200
      template(v-if="wantImage")
        .insp
          button.insp__pill(type="button" :aria-expanded="inspOpen" @click="toggleInspirations") {{ t('marketing.inspiration') }}
          span.insp__hint {{ t('marketing.inspirationHint') }}
        .inspList(v-if="inspOpen")
          button.inspList__item(v-for="i in inspirations" :key="i.id" type="button" :aria-pressed="inspirationId === i.id" :class="{ isActive: inspirationId === i.id }" @click="inspirationId = inspirationId === i.id ? '' : i.id")
            img.inspList__img(v-if="i.url" :src="i.url" :alt="i.name")
            span(v-else) {{ i.name }}
    BrandToggle.post__brand(
      v-model="applyBrand"
      :description="t('marketing.brandDescription')"
      @edit="goBrandSettings"
    )
    .step
      .step__title {{ t('marketing.steps.ratio') }}
      .ratios
        button.ratiocard(v-for="r in ratios" :key="r.v" :aria-pressed="ratio === r.v" :class="{ 'isActive': ratio === r.v }" @click="ratio = r.v")
          span.ratiocard__label {{ r.label }}
          span.ratiocard__desc {{ r.desc }}
    p.err(v-if="errorMsg" role="alert") {{ errorMsg }}
    .post__footer
      .cost
        .cost__label {{ t('common.estimatedCost') }}
        .cost__value
          button.cost__feedBtn(type="button" :aria-label="t('feedBadge.topup')" @click="topUpOpen = true")
            IconFeedBottleSmall.cost__icon
          span {{ t('units.feed', { count: outputTypeCost }) }}
      AppButton(:disabled="generating || !canGenerate" @click="generate(retryHalf)")
        component(:is="generating ? IconLoader : IconAddObject" :class="{ spin: generating }")
        span {{ generating ? t('common.generating') : retryHalf ? t(`marketing.retryOnly.${retryHalf}`) : t('marketing.generate') }}

  section.panel.post__result
    h2.result__title {{ t('common.generationResult') }}
    .result__empty(v-if="!result") {{ t('marketing.emptyResult') }}
    template(v-else)
      .visuallyHidden(role="status" aria-live="polite") {{ t('common.generationResult') }}
      .postresult
        //- 欄位依「這次要求了哪幾半」顯示，不是依「哪一半成功」：只成功一半時，失敗那欄仍要留著自己的重試按鈕
        .postresult__col(v-if="resultType !== 'textOnly'")
          .poster(:class="{ isPortrait: ratio === '9:16' }" :style="{ aspectRatio: aspect }")
            img.poster__img(v-if="result.poster?.url" :src="result.poster.url" :alt="t('common.generationResult')")
            IconImagePlaceholder(v-else)
          .postresult__act
            button.linkbtn(:disabled="generating || !canGenerateFor('imageOnly')" @click="generate('imageOnly')") {{ t('marketing.changeImage') }}
            button.linkbtn(:disabled="!result.poster || !!result.poster.savedAssetId || generating || savingPoster" @click="savePoster") {{ result.poster?.savedAssetId ? t('common.saved') : t('common.saveToLibrary') }}
            button.linkbtn(:disabled="!result.poster" @click="downloadPoster") {{ t('common.download') }}
        .postresult__col(v-if="resultType !== 'imageOnly'")
          .copy(v-if="result.copy !== undefined")
            p.copy__text(v-for="(line, i) in copyLines" :key="i") {{ line }}
            p.copy__tags {{ result.hashtags.join(' ') }}
          .postresult__act
            AppButton(variant="outline" :disabled="result.copy === undefined" @click="copyText")
              IconCopy
              span {{ copied ? t('common.copied') : t('marketing.copyText') }}
            button.linkbtn(:disabled="generating || !canGenerateFor('textOnly')" @click="generate('textOnly')") {{ t('marketing.rewrite') }}
      .postresult__note
        img.postresult__noteIcon(:src="postNextStepIconUrl" alt="")
        span {{ t('marketing.nextStep') }}

  ImagePickerDialog(v-model:open="pickerOpen" :title="t('marketing.pickerTitle')" @select="onPick")
  TopUpDialog(v-model:open="topUpOpen")
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useEventListener } from '@vueuse/core'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import TopUpDialog from '@/components/TopUpDialog.vue'
import AppButton from '@/components/AppButton.vue'
import BrandToggle from '@/components/BrandToggle.vue'
import { IconFeedBottleSmall, IconAddObject, IconCopy, IconImagePlaceholder, IconLoader } from '@/components/icons'
import postNextStepIconUrl from '@/assets/images/marketing-next-step-alert.svg'
import { useFeedStore } from '@/stores/feed'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import { useAssets } from '@/composables/useAssets'
import { api } from '@/api'
import { API_ERROR_CODES, hasErrorCode } from '@/api/errors'
import { displayMessage, isInsufficientFeed } from '@/utils/error'
import { downloadFile } from '@/utils/download'
import { mergePost, retryTarget } from '@/utils/generation'
import type { Asset, GeneratedPost, Inspiration, PostOutputType } from '@/types/api'

const router = useRouter()
const feed = useFeedStore()
const tasksStore = useGenerationTasksStore()
const { saveGenerated } = useAssets()
const { t } = useI18n()

const productImage = ref<Asset | null>(null)
const intro = ref('') // 商品介紹：送 productDesc，寫貼文用
const posterText = ref('') // 海報文字：送 posterText，會印在圖上
const inspirations = ref<Inspiration[]>([])
const inspirationId = ref('')
const prices = ref<Partial<Record<string, number>>>({})
const applyBrand = ref(true)
const inspOpen = ref(false)
const pickerOpen = ref(false)
const topUpOpen = ref(false)
const generating = ref(false)
const errorMsg = ref('')
const result = ref<GeneratedPost | null>(null)
const savingPoster = ref(false) // 存入圖庫送出中：連點兩下只送一發；換一張圖後新海報沒有 savedAssetId，按鈕自然回到「存入圖庫」
const resultType = ref<PostOutputType>('both') // 目前的結果「要求了」哪幾半；只成功一半時，失敗那一欄仍要顯示重試按鈕
const copied = ref(false)

// 要產出什麼。價格讀 GET /ai-models?modelType=marketing：要配圖加 marketingImage、要文案加 marketingText
const outputType = ref<PostOutputType>('both')
const wantImage = computed(() => outputType.value !== 'textOnly')
const wantText = computed(() => outputType.value !== 'imageOnly')
// 只看這個類型用得到的單價：後端停用（沒回傳）的那一支沒有價格，只有用到它的類型停用
function costOf(type: PostOutputType): number | '…' {
  const img = type === 'textOnly' ? 0 : prices.value.marketingImage
  const txt = type === 'imageOnly' ? 0 : prices.value.marketingText
  return img === undefined || txt === undefined ? '…' : img + txt
}
const outputTypeOptions = computed(() =>
  (['both', 'textOnly', 'imageOnly'] as const).map((value) => ({
    value,
    label: t(`marketing.outputType.options.${value}`),
    cost: costOf(value),
  })),
)
// 「文案＋配圖」只成功一半時，主按鈕只重做失敗的那一半（已成功的那半不再扣點）；改任何輸入或輸出類型就回到照所選類型
const retryHalf = ref<'imageOnly' | 'textOnly'>()
const mainTarget = computed(() => retryHalf.value ?? outputType.value)
const outputTypeCost = computed(() => costOf(mainTarget.value))
// 主按鈕看 mainTarget；「換一張圖」「重寫文案」各看自己那一半（欄位被清空時擋在前端，後端只會回籠統的值域錯）。
// 價格沒載入（顯示「…」）也不給送：畫面沒有標價，後端照樣扣點
const canGenerateFor = (type: PostOutputType) =>
  typeof costOf(type) === 'number' &&
  (type === 'textOnly' || (!!productImage.value && !!posterText.value.trim())) &&
  (type === 'imageOnly' || !!intro.value.trim())
const canGenerate = computed(() => canGenerateFor(mainTarget.value))

// 生成中離開頁面，結果只活在這個元件裡、卸載就沒了，後端卻照樣結清飼料
onBeforeRouteLeave(() => !generating.value || window.confirm(t('common.leaveWhileGenerating')))
useEventListener(window, 'beforeunload', (e) => {
  if (generating.value) e.preventDefault()
})

onMounted(async () => {
  try {
    const models = await api.listModels('marketing')
    prices.value = Object.fromEntries(models.map((m) => [m.modelKey, m.costFeeds]))
  } catch (e: unknown) {
    errorMsg.value = displayMessage(e, t('errors.loadFailed'))
  }
})

async function toggleInspirations() {
  inspOpen.value = !inspOpen.value
  if (!inspOpen.value || inspirations.value.length) return // 只在第一次展開時請求
  try {
    inspirations.value = await api.listInspirations()
  } catch (e: unknown) {
    errorMsg.value = displayMessage(e, t('errors.loadFailed'))
  }
}

// 輸出比例（生成前於設定區選定，影響構圖與結果預覽比例）
const ratios = computed(() => [
  { v: '1:1', label: '1:1', desc: t('marketing.ratios.post'), ar: '1 / 1' },
  { v: '16:9', label: '16:9', desc: t('marketing.ratios.banner'), ar: '16 / 9' },
  { v: '9:16', label: '9:16', desc: t('marketing.ratios.story'), ar: '9 / 16' },
])
const ratio = ref('1:1')
// 改任何輸入或輸出類型：主按鈕回到照所選類型兩半重做（retryHalf 的說明在上面）。
// inputVersion 讓「生成途中改了輸入」的那次回應不再把 retryHalf 設回去
let inputVersion = 0
watch([outputType, productImage, intro, posterText, inspirationId, applyBrand, ratio], () => {
  retryHalf.value = undefined
  inputVersion++
})
const aspect = computed(() => ratios.value.find((r) => r.v === ratio.value)?.ar ?? '1 / 1')

const goBrandSettings = () => router.push('/settings')
const copyLines = computed(() => result.value?.copy?.split('\n\n') ?? [])
const onPick = (a: Asset) => {
  productImage.value = a
}

const failText = (e: unknown) =>
  isInsufficientFeed(e) ? t('errors.insufficientFeed') : displayMessage(e, t('errors.generationFailed'))
// 任務中心一半一筆（配圖、文案各自扣點、各自成敗）；名稱比照圖生圖「類型_前 12 字」
const taskHalves = (type: PostOutputType) =>
  (['marketingImage', 'marketingText'] as const)
    .filter((kind) => type !== (kind === 'marketingImage' ? 'textOnly' : 'imageOnly'))
    .map((kind) => ({
      kind,
      name: t(`marketing.taskName.${kind}`, {
        name: (kind === 'marketingImage' ? posterText.value : intro.value).trim().slice(0, 12),
      }),
      cost: prices.value[kind] ?? 0,
    }))

// only：「換一張圖」只重做配圖、「重寫文案」只重做文案，另一半保留、不重複扣點。
// 模板點擊一律寫成 generate() 或 generate('imageOnly')，不能只寫函式名（Vue 會把 MouseEvent 當成 only 傳進來）
async function generate(only?: 'imageOnly' | 'textOnly') {
  if (generating.value) return
  const sentType = only ?? outputType.value
  const sentVersion = inputVersion
  errorMsg.value = ''
  generating.value = true
  copied.value = false
  try {
    const next = await tasksStore.createMarketingTask(
      () =>
        api.generatePost({
          outputType: sentType,
          useBrand: applyBrand.value,
          imageId: productImage.value?.id,
          posterText: posterText.value,
          ratio: ratio.value, // 版位比例一併送給後端，影響構圖
          inspirationId: inspirationId.value || undefined,
          productDesc: intro.value,
        }),
      taskHalves(sentType),
      failText,
    )
    if (!result.value || !only) resultType.value = sentType
    result.value = mergePost(result.value, next, only)
    retryHalf.value = sentVersion === inputVersion ? retryTarget(retryHalf.value, next, only) : undefined
    // 只成功一半：點名失敗的是哪一半（主按鈕與那一欄的重試鈕都只重做那一半）
    if (next.partialError)
      errorMsg.value = t(next.poster ? 'marketing.partialFailed.text' : 'marketing.partialFailed.image', {
        reason: failText(next.partialError),
      })
  } catch (e: unknown) {
    errorMsg.value = failText(e)
  } finally {
    generating.value = false
    // 成功或失敗都刷新（CONTENT_BLOCKED 會扣點、失敗的 202 會退點）；刷新失敗不覆蓋生成的錯誤訊息
    await feed.refresh().catch(() => undefined)
  }
}
async function downloadPoster() {
  const poster = result.value?.poster
  if (!poster) return
  errorMsg.value = ''
  try {
    if (poster.url) await downloadFile(poster.url) // mock 的結果沒有檔案，跳過
    if (!poster.adopted) {
      await api.recordAdoption(poster)
      poster.adopted = true
    }
  } catch (e: unknown) {
    errorMsg.value = displayMessage(e, t('errors.downloadFailed'))
  }
}
// 結果只是 24 小時的 tempUrl，存入圖庫才會出現在圖庫的「AI 生成」；流程同圖生圖頁的 saveToLib
async function savePoster() {
  const poster = result.value?.poster
  if (!poster || poster.savedAssetId || savingPoster.value) return
  errorMsg.value = ''
  savingPoster.value = true
  try {
    const a = await saveGenerated(t('marketing.savedName', { id: poster.id }), poster)
    poster.savedAssetId = a.id
    poster.adopted = true // 後端 /save 自己會記採用，不必再送 events
  } catch (e: unknown) {
    // 前一發其實存進去了、只是回應在路上丟了：當成已存入（拿不到素材 id，畫面只看有沒有值）
    if (hasErrorCode(e, API_ERROR_CODES.ALREADY_SAVED)) {
      poster.savedAssetId = 'unknown'
      poster.adopted = true
    } else errorMsg.value = displayMessage(e, t('errors.submitFailed'))
  } finally {
    savingPoster.value = false
  }
}
async function copyText() {
  if (!result.value) return
  const text = (result.value.copy ?? '') + '\n\n' + result.value.hashtags.join(' ')
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
  } catch {
    /* noop */
  }
}
</script>

<style scoped lang="scss">
.post {
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
.post__input {
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
  &__actions {
    @include flex(flex-start, center, 0.75rem);
  }
  &__hint {
    font-size: 0.75rem;
    color: #b4b9c4;
  }
}
.field {
  position: relative;
  & + & {
    margin-top: 0.75rem;
  }
  &__label {
    display: block;
    font-size: 0.75rem;
    color: $gray-100;
    margin-bottom: 0.375rem;
  }
  &__input {
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
  &__counter {
    position: absolute;
    right: 0.75rem;
    bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: $orange;
  }
}
.inspList {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
  &__item {
    @include flex(center, center);
    aspect-ratio: 1;
    overflow: hidden;
    padding: 0.25rem;
    border: 1px solid #d2d5dd;
    border-radius: 8px;
    background: $white;
    font-size: 0.75rem;
    color: #606692;
    &.isActive {
      background: $blue-light;
      border: 1.5px solid $blue-dark-500;
      color: $blue-dark-500;
    }
  }
  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
  }
}
.insp {
  @include flex(flex-start, center, 0.5rem);
  margin-top: 0.625rem;
  &__pill {
    padding: 0.1875rem 0.75rem;
    border-radius: 16px;
    font-size: 0.8125rem;
    color: $dark-blue-gray;
    background: #f6eac1;
  }
  &__hint {
    font-size: 0.75rem;
    color: $gray-100;
  }
}
.post__brand {
  margin: 1rem 0;
}
.outputTypes {
  @include flex(flex-start, stretch, 0.25rem);
  background: $blue-light;
  padding: 0.25rem;
  border-radius: 10px;
}
.outputTypeCard {
  @include flex(center, center, 0.0625rem);
  flex-direction: column;
  flex: 1 0 0;
  padding: 0.4375rem 0.625rem;
  border-radius: 8px;
  background: transparent;
  &__label {
    font-size: 0.75rem;
    font-weight: 400;
    line-height: 1.375;
    color: #606692;
  }
  &__cost {
    @include flex(center, center, 0.25rem);
    font-size: 0.625rem;
    line-height: 1.333;
    color: $gray-100;
  }
  &__icon {
    width: 0.6875rem;
    height: 0.6875rem;
    flex-shrink: 0;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  &.isActive {
    background: $white;
    box-shadow: 0px 1px 1.5px rgba(0, 0, 0, 0.1);
    .outputTypeCard__label {
      font-weight: 500;
      color: $blue-dark-500;
    }
    .outputTypeCard__cost {
      color: $orange;
    }
  }
}
.outputTypeHint {
  font-size: 0.75rem;
  color: $gray-100;
  margin-top: 0.5rem;
}
.ratios {
  @include flex(flex-start, stretch, 0.5rem);
  flex-wrap: wrap;
}
.ratiocard {
  @include flex(center, center, 0.125rem);
  flex-direction: column;
  width: 7rem;
  height: 3.75rem;
  padding: 0.625rem;
  border: 1px solid #d2d5dd;
  border-radius: 8px;
  background: $white;
  &__label {
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.375;
    color: $dark-blue-gray;
  }
  &__desc {
    font-size: 0.75rem;
    line-height: 1.333;
    color: #606692;
  }
  &.isActive {
    background: $blue-light;
    border: 1.5px solid $blue-dark-500;
    .ratiocard__label {
      color: $blue-dark-500;
    }
  }
}
.err {
  color: $red;
  font-size: 0.8125rem;
  margin: 0.5rem 0;
}
.post__footer {
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
  &__feedBtn {
    display: inline-flex;
    align-items: center;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    color: inherit;
    cursor: pointer;
    line-height: 0;
  }
}
.post__result {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}
.result__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: $dark-blue-gray;
  margin-bottom: 0;
}
.result__empty {
  color: $gray-100;
  font-size: 0.875rem;
  padding: 2.5rem 0;
  text-align: center;
}
.postresult {
  @include flex(flex-start, flex-start, 1.25rem);

  @media (min-width: $bp-lg) {
    flex: 1;
    min-height: 0;
    align-items: stretch;
  }

  @include below($bp-sm) {
    flex-direction: column;
  }
}
.postresult__col {
  display: flex;
  flex-direction: column;
  &:first-child {
    width: 18.75rem;
    flex-shrink: 0;
    gap: 0.5rem;
  }
  &:last-child {
    flex: 1;
    min-width: 0;
    gap: 0.75rem;
  }
  @media (min-width: $bp-lg) {
    // Figma 12:90 基準為圖片欄 300、文字欄 318；
    // 使用比例分配剩餘寬度，避免桌面版把圖片欄寫死為 300px。
    &:first-child {
      width: auto;
      min-width: 0;
      flex: 300 1 0;
    }
    &:last-child {
      flex: 318 1 0;
    }
  }
  @include below($bp-sm) {
    &:first-child {
      width: 100%;
    }
  }
  // 只選「只要文案」或「只要配圖」時，結果區只渲染一欄——該欄獨佔整個結果區寬度，不維持雙欄骨架
  &:only-child {
    width: 100%;
    flex: 1 1 auto;
    @media (min-width: $bp-lg) {
      flex: 1 1 auto;
    }
  }
}
.postresult__act {
  @include flex(flex-start, center, 0.75rem);
  flex-shrink: 0;
}
.postresult__note {
  @include flex(flex-start, center, 0.625rem);
  background: $blue-light;
  border-left: 3px solid $babyBlue;
  border-radius: 8px;
  padding: 0.75rem 0.875rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: $dark-blue-gray;
  line-height: normal;
  &-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }
}
.poster__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}
.poster {
  @include flex(center, center);
  background: #eef1f7;
  border-radius: 8px;
  color: $babyBlue;
  font-size: 2.75rem;
  width: 100%;

  @media (min-width: $bp-lg) {
    &.isPortrait {
      width: auto;
      max-width: 100%;
      height: calc(100% - 1.75rem);
      max-height: calc(100% - 1.75rem);
      align-self: center;
    }
  }
}
.copy {
  background: $blue-light;
  border-radius: 8px;
  padding: 1rem;
  width: 100%;
  &__text {
    font-size: 1rem;
    color: $dark-blue-gray;
    line-height: 1.375;
    margin-bottom: 0.5rem;
  }
  &__tags {
    font-size: 1rem;
    line-height: 1.375;
    color: $dark-blue-gray;
  }
}
.linkbtn {
  font-size: 0.875rem;
  color: #606692;
  padding: 0;
  &:hover {
    color: $blue-dark-500;
  }
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
