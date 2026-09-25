<template lang="pug">
.tryon
  h1.visuallyHidden {{ t('routeTitles.generateTryOn') }}
  .consentBar(v-if="consentLoaded && !consented")
    IconAlertTriangleFilled.consentBar__icon
    .consentBar__text
      strong {{ t('tryOn.consentBanner.title') }}
      span {{ t('tryOn.consentBanner.description') }}
    AppButton(variant="outline" @click="showConsent = true") {{ t('tryOn.consentBanner.action') }}

  .tryon__body
    section.panel.tryon__input
      .tryon__scroll
        .tryon__steps
          .step
            .step__title {{ t('tryOn.steps.model') }}
            .subtabs(role="tablist" :aria-label="t('tryOn.steps.model')")
              button.subtab(v-for="s in modelTabs" :key="s.value" role="tab" :aria-selected="modelTab === s.value" :class="{ 'isActive': modelTab === s.value }" @click="modelTab = s.value") {{ s.label }}
            template(v-if="modelTab === 'builtIn'")
              p.models__empty(v-if="!models.length") {{ t('tryOn.noBuiltInModels') }}
              Swiper.models(v-else :modules="[Navigation]" :slides-per-view="4" :space-between="10" navigation)
                SwiperSlide(v-for="m in models" :key="m.materialId")
                  button.model(:aria-pressed="model === m.materialId" :class="{ 'isActive': model === m.materialId }" @click="model = m.materialId")
                    span.model__thumb
                      img.model__thumbImage(:src="m.url" :alt="m.materialName")
                    span.model__label {{ m.materialName }}
              button.link {{ t('tryOn.viewFullLibrary', { count: models.length }) }}
            template(v-else)
              label.mdrop(:class="{ 'isDisabled': uploading }" :aria-busy="uploading")
                input.mdrop__input(type="file" accept="image/jpeg,image/png,image/webp" :disabled="uploading" @change="onModelUpload")
                IconLoader.mdrop__icon.spin(v-if="uploading")
                IconUpload.mdrop__icon(v-else)
                span.mdrop__title {{ t('tryOn.upload.title') }}
                span.mdrop__hint {{ t('tryOn.upload.hint') }}
              .mtip {{ t('tryOn.upload.recommendation') }}
              template(v-if="uploadedModels.length")
                .uphead
                  span.uphead__title {{ t('tryOn.uploadedModels') }}
                  span.uphead__grow
                  span.uphead__count {{ uploadedModels.length }} / {{ MODEL_PHOTO_LIMIT }}
                .uplist
                  .uprow(v-for="u in uploadedModels" :key="u.id" :class="{ 'isActive': uploadedModel === u.id }")
                    button.uprow__pick(type="button" :aria-pressed="uploadedModel === u.id" @click="uploadedModel = u.id")
                      span.uprow__thumb
                        img.uprow__thumbImage(v-if="u.url" :src="u.url" :alt="u.name" @error="u.url = undefined")
                        IconImagePlaceholder(v-else)
                      span.uprow__name {{ u.name }}
                    button.uprow__del(@click="removeModel(u.id)" :aria-label="t('common.delete')")
                      IconDelete
                .pconsent
                  AppCheckbox.pconsent__check(v-model="personConsent") {{ t('tryOn.personConsent') }}
                  button.pconsent__link(type="button" @click.prevent="showConsent = true") {{ t('tryOn.viewTerms') }}
          .step
            .step__title {{ t('tryOn.steps.apparel') }}
            .dropzone
              IconImagePlaceholder.dropzone__icon
              span.dropzone__name(v-if="apparel") {{ apparel.name }}
            .dropzone__actions
              AppButton(variant="outline" @click="pickerOpen = true") {{ t('common.selectFromLibrary') }}
              span.dropzone__hint {{ t('tryOn.removeBackgroundHint') }}
        span.tryon__fade(aria-hidden="true")
      .tryon__sticky
        p.err(v-if="errorMsg" role="alert") {{ errorMsg }}
        .tryon__footer
          .cost
            .cost__label {{ t('common.estimatedCost') }}
            .cost__value
              button.cost__feedBtn(type="button" :aria-label="t('feedBadge.topup')" @click="topUpOpen = true")
                IconFeedBottleSmall.cost__icon
              span {{ price === undefined ? '…' : t('units.feed', { count: price }) }}
          AppButton(:disabled="!canGenerate" @click="onGenerate")
            IconLoader.spin(v-if="generating")
            span {{ generating ? t('common.generating') : t('tryOn.generate') }}

    section.panel.tryon__result
      .result__head
        h2.result__title {{ t('tryOn.resultTitle') }}
        span.result__hint {{ t('tryOn.resultHint') }}
      .result__wrap
        .result__box
          img.result__img(v-if="result" :src="result.url" :alt="t('tryOn.resultTitle')")
          IconPlayCircle.result__play(v-else)
      .result__actions(v-if="result" role="status" aria-live="polite")
        AppButton(variant="outline" :disabled="generating || saving" @click="saveResult") {{ result.savedAssetId ? t('common.saved') : t('common.saveToLibrary') }}
        button.linkbtn(:disabled="generating" @click="download") {{ t('common.download') }}
        button.linkbtn(:disabled="!canGenerate" @click="onGenerate") {{ t('common.regenerate') }}

  ImagePickerDialog(v-model:open="pickerOpen" :title="t('tryOn.pickerTitle')" :exclude-sources="['tryonModel']" @select="onPick")
  TopUpDialog(v-model:open="topUpOpen")

  Teleport(to="body")
    .cmodal(v-if="showConsent" @click.self="closeConsent")
      .cdialog(ref="consentDialogRef" role="dialog" aria-modal="true" aria-labelledby="consent-dialog-title" aria-describedby="consent-dialog-intro" tabindex="-1")
        .cdialog__head
          IconAlertTriangleFilled.cdialog__alert
          h3#consent-dialog-title.cdialog__title {{ t('tryOn.terms.title') }}
          span.cdialog__grow
          button.cdialog__close(type="button" data-dialog-initial-focus @click="closeConsent" :aria-label="t('common.close')")
            IconClose
        p#consent-dialog-intro.cdialog__intro {{ t('tryOn.terms.intro') }}
        .terms
          p.terms__text {{ consentTemplate }}
        AppCheckbox.ack(v-model="ackChecked") {{ t('tryOn.terms.acknowledgement') }}
        p.err(v-if="consentErr" role="alert") {{ consentErr }}
        .cdialog__act
          span.cdialog__grow
          AppButton(variant="outline" @click="goCompliance") {{ t('tryOn.terms.openCompliance') }}
          AppButton(:disabled="!ackChecked" @click="acknowledge") {{ t('tryOn.terms.understand') }}
        p.cdialog__foot {{ t('tryOn.terms.footer') }}
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useEventListener } from '@vueuse/core'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import TopUpDialog from '@/components/TopUpDialog.vue'
import AppButton from '@/components/AppButton.vue'
import AppCheckbox from '@/components/AppCheckbox.vue'
import {
  IconPlayCircle,
  IconFeedBottleSmall,
  IconAlertTriangleFilled,
  IconClose,
  IconDelete,
  IconImagePlaceholder,
  IconLoader,
  IconUpload,
} from '@/components/icons'
import { useBrandStore } from '@/stores/brand'
import { useConsentStore } from '@/stores/consent'
import { useFeedStore } from '@/stores/feed'
import { useAssets } from '@/composables/useAssets'
import { api } from '@/api'
import { API_ERROR_CODES, hasErrorCode } from '@/api/errors'
import { displayMessage, isFileTooLarge, isInsufficientFeed, isUnsupportedFormat } from '@/utils/error'
import { downloadFile } from '@/utils/download'
import type { Asset, GeneratedImage, Material, TryOnReq } from '@/types/api'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'

const router = useRouter()
const brand = useBrandStore()
const consentStore = useConsentStore()
const { consented, loaded: consentLoaded } = storeToRefs(consentStore)
const feed = useFeedStore()
const { saveGenerated, upload, deleteAssets } = useAssets()
const { t } = useI18n()

// 後端每隻機器人的模特照上限（docs/api/v14.md #4）；只用來顯示 n／20，擋不擋由後端 400 決定
const MODEL_PHOTO_LIMIT = 20

const modelTabs = computed(() => [
  { value: 'builtIn', label: t('tryOn.tabs.builtIn') },
  { value: 'upload', label: t('tryOn.tabs.upload') },
])
const modelTab = ref('builtIn')
// 內建模特庫：改為呼叫 api.listMaterials('model') 載入真實素材，取代原本寫死的四個字串
const models = ref<Material[]>([])
const model = ref('')

// 已上傳的模特照（GET /images?source=tryonModel）：id＝後端 imageId（POST /tryon 的 modelRefId）；
// url＝後端 R2 縮圖，mock 沒有真實檔案時為 undefined。後端沒有審核，沒有狀態欄位
type UploadedModel = { id: string; name: string; url?: string }
const uploadedModels = ref<UploadedModel[]>([])
const uploadedModel = ref('') // 「上傳模特照」分頁選中的那張（imageId）
// 送給後端的模特：看目前在哪個分頁——內建分頁送 material＋materialId，上傳分頁送 upload＋imageId
const modelRef = computed<Pick<TryOnReq, 'modelSource' | 'modelRefId'>>(() =>
  modelTab.value === 'builtIn'
    ? { modelSource: 'material', modelRefId: model.value }
    : { modelSource: 'upload', modelRefId: uploadedModel.value },
)
const personConsent = ref(true) // 面板「我已取得此人肖像使用同意」勾選
const ackChecked = ref(false) // 對話框「我已取得當事人同意…」勾選
const consentErr = ref('') // 同意視窗裡的錯誤（視窗蓋在底部固定區上面，errorMsg 在那裡看不到）

const apparel = ref<Asset | null>(null)
const pickerOpen = ref(false)
const topUpOpen = ref(false)
const showConsent = ref(false)
const consentDialogRef = ref<HTMLElement | null>(null)
const generating = ref(false)
const uploading = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const result = ref<GeneratedImage | null>(null)
// 單價讀 GET /ai-models?modelType=tryon（只回啟用的那一檔）；載入前不能生成
const price = ref<number>()
const canGenerate = computed(
  () => !generating.value && price.value !== undefined && !!modelRef.value.modelRefId && !!apparel.value,
)
// 同意視窗顯示品牌設定的肖像權條款模板；還沒設定過就用 i18n 預設文字（brand store 載入後也會補同一段）
const consentTemplate = computed(() => brand.profile?.portraitConsent || t('brandSettings.defaults.portraitConsent'))

// 生成中離開頁面，結果只活在這個元件裡、卸載就沒了，後端卻照樣結清飼料
onBeforeRouteLeave(() => !generating.value || window.confirm(t('common.leaveWhileGenerating')))
useEventListener(window, 'beforeunload', (e) => {
  if (generating.value) e.preventDefault()
})

onMounted(() => {
  // 三支載入互不依賴，失敗各自處理：同意狀態失敗當未同意（PUT 時會再問）、模特庫失敗顯示空狀態、
  // 價格失敗顯示載入錯誤且生成鈕維持停用
  consentStore.load().catch(() => undefined)
  brand.load().catch(() => undefined)
  api
    .listMaterials('model')
    .then((res) => {
      models.value = res.items
      if (res.items.length) model.value = res.items[0].materialId
    })
    .catch(() => {
      // 失敗模式：載入失敗時比照空陣列處理，畫面顯示空狀態文字，不渲染壞掉的 Swiper
      models.value = []
    })
  api
    .listImages({ source: 'tryonModel', pageSize: MODEL_PHOTO_LIMIT })
    .then((res) => {
      uploadedModels.value = res.items.map((a) => ({ id: a.id, name: a.name, url: a.url }))
    })
    .catch((e: unknown) => {
      errorMsg.value = displayMessage(e, t('errors.loadFailed'))
    })
  api
    .listModels('tryon')
    .then((tiers) => {
      price.value = tiers[0]?.costFeeds
      // 後端只回啟用的檔位；一檔都沒開（例如切換供應商期間）就跟載入失敗一樣：留「…」並說明，不讓按鈕無聲停用
      if (price.value === undefined) errorMsg.value = t('errors.loadFailed')
    })
    .catch((e: unknown) => {
      errorMsg.value = displayMessage(e, t('errors.loadFailed'))
    })
})

const onPick = (a: Asset) => {
  apparel.value = a
}
async function onModelUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = '' // 允許重複選同一檔
  if (!f || uploading.value) return
  // 上傳真人照片涉及肖像權：未同意就先開同意視窗、檔案不離開瀏覽器（同意後再選一次），比照 onGenerate。
  // 先等掛載時的 GET 回來（已載入就直接回），不然已同意的人搶在回應前選檔會被當成未同意、檔案白選
  await consentStore.load().catch(() => undefined)
  if (!consented.value) {
    showConsent.value = true
    return
  }
  uploading.value = true
  errorMsg.value = ''
  try {
    // 走既有的素材上傳路徑（真後端 POST /upload、mock 走假資料），帶 source=tryonModel 標成模特照：
    // 重新整理後用 GET /images?source=tryonModel 撈得回來，圖庫卡片也分得出是模特照
    const a = await upload(f, undefined, undefined, undefined, 'tryonModel')
    // 放最前面：與重新整理後 GET /images 的 createdAt 倒序一致，新上傳的那張不會被推到清單底部看不見
    uploadedModels.value.unshift({ id: a.id, name: a.name, url: a.url })
    uploadedModel.value = a.id
  } catch (e: unknown) {
    // 第 21 張後端回 400 VALUE_OUT_OF_RANGE，直接顯示後端寫給人看的訊息
    errorMsg.value = isFileTooLarge(e)
      ? t('errors.fileTooLarge')
      : isUnsupportedFormat(e)
        ? t('errors.unsupportedFormat')
        : displayMessage(e, t('errors.submitFailed'))
  } finally {
    uploading.value = false
  }
}
async function removeModel(id: string) {
  // 要連圖庫裡的素材一起刪（DELETE /images/{id}），否則按了「刪除」肖像照仍留在 R2 與圖庫。
  // 刪不掉就留著列、顯示錯誤，不假裝已刪
  errorMsg.value = ''
  const { failedIds } = await deleteAssets([id])
  if (failedIds.length) {
    errorMsg.value = t('library.batchFailed', { count: 1 })
    return
  }
  uploadedModels.value = uploadedModels.value.filter((m) => m.id !== id)
  if (uploadedModel.value === id) uploadedModel.value = ''
}
function closeConsent() {
  showConsent.value = false
  ackChecked.value = false // 下次開啟要重新勾
  consentErr.value = ''
}
useAccessibleDialog(showConsent, consentDialogRef, closeConsent)
async function acknowledge() {
  if (!ackChecked.value) return // 未勾選確認前不可繼續
  consentErr.value = ''
  try {
    await consentStore.give() // 已同意（從「查看條款」開的）時 store 不重打 PUT
    personConsent.value = true
    closeConsent()
  } catch (e: unknown) {
    // PUT 失敗視窗留著、錯誤顯示在視窗裡，使用者才知道要再按一次
    consentErr.value = displayMessage(e, t('errors.submitFailed'))
  }
}
const goCompliance = () => router.push('/settings')
async function saveResult() {
  const r = result.value
  if (!r || r.savedAssetId || saving.value) return
  errorMsg.value = ''
  saving.value = true
  try {
    const a = await saveGenerated(t('tryOn.savedName', { timestamp: Date.now() }), r)
    r.savedAssetId = a.id
    r.adopted = true // 後端 /save 自己會記採用，不必再送 events
  } catch (e: unknown) {
    // 前一發其實存進去了、只是回應在路上丟了：當成已存入（同圖生圖頁）
    if (hasErrorCode(e, API_ERROR_CODES.ALREADY_SAVED)) {
      r.savedAssetId = 'unknown'
      r.adopted = true
    } else errorMsg.value = displayMessage(e, t('errors.submitFailed'))
  } finally {
    saving.value = false
  }
}
async function download() {
  const r = result.value
  if (!r) return
  errorMsg.value = ''
  try {
    await downloadFile(r.url)
    // 採用事件：後端 record_adoption_event 只查 generation 屬不屬於本 bot，不看類型，試穿也收；
    // 但 MV-07 採用率（metrics_calc）只算 type='generate'，這一發目前只記在結果列上、不進採用率
    if (!r.adopted) {
      await api.recordAdoption(r)
      r.adopted = true
    }
  } catch (e: unknown) {
    errorMsg.value = displayMessage(e, t('errors.downloadFailed'))
  }
}

async function onGenerate() {
  const cloth = apparel.value
  if (!canGenerate.value || !cloth) return
  await consentStore.load().catch(() => undefined) // 同 onModelUpload：先等同意狀態回來再判斷
  if (!consented.value) {
    showConsent.value = true
    return
  } // 未同意 → 擋住並要求同意
  errorMsg.value = ''
  generating.value = true
  try {
    result.value = await api.tryOn({ ...modelRef.value, clothImageId: cloth.id })
  } catch (e: unknown) {
    // 後端說這個使用者還沒同意（本機狀態過期）：改回未同意並開同意視窗，不當成生成失敗
    if (hasErrorCode(e, API_ERROR_CODES.CONSENT_REQUIRED)) {
      consented.value = false
      showConsent.value = true
    } else
      errorMsg.value = isInsufficientFeed(e)
        ? t('errors.insufficientFeed')
        : displayMessage(e, t('errors.generationFailed'))
  } finally {
    generating.value = false
    // 成功或失敗都刷新：內容被擋會扣點、失敗的 202 會退點；刷新失敗不覆蓋生成的錯誤訊息
    await feed.refresh().catch(() => undefined)
  }
}
</script>

<style scoped lang="scss">
.consentBar {
  @include flex(flex-start, center, 0.625rem);
  background: $blue-light;
  border-left: 3px solid $yellow;
  border-radius: 8px;
  padding: 0.75rem 0.875rem;
  margin-bottom: 1.125rem;
  &__icon {
    font-size: 1.25rem;
    color: $orange;
    flex-shrink: 0;
  }
  &__text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    strong {
      font-size: 0.875rem;
      font-weight: 500;
      color: $dark-blue-gray;
    }
    span {
      font-size: 0.8125rem;
      color: #606692;
    }
  }
  @include below($bp-sm) {
    align-items: flex-start;
    flex-wrap: wrap;
    &__text {
      min-width: calc(100% - 2rem);
    }
    > :deep(.appButton) {
      margin-left: auto;
    }
  }
}
.tryon {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
.tryon__body {
  display: grid;
  grid-template-columns: 25rem 1fr;
  gap: 1rem;
  align-items: stretch;
  flex: 1; // 撐滿 .tryon 扣掉同意條款列後的剩餘高度，讓左右面板等高並接近底部
  @include below($bp-lg) {
    grid-template-columns: 1fr;
  }
}
.tryon__input {
  display: flex;
  flex-direction: column;
}
.tryon__scroll {
  @media (min-width: 80.0625rem) {
    position: relative;
    flex: 1;
    min-height: 0;
  }
}
.tryon__fade {
  display: none;
  @media (min-width: 80.0625rem) {
    display: block;
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 1.75rem;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0), $white);
    pointer-events: none;
  }
}
.panel {
  background: $white;
  border-radius: 10px;
  box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2);
  padding: 1.5rem;
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
.subtabs {
  @include flex(flex-start, center, 0.5rem);
  margin-bottom: 0.875rem;
}
.subtab {
  padding: 0.1875rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8125rem;
  color: #606692;
  border: 1px solid $gray;
  background: $white;
  &.isActive {
    background: $blue-dark-500;
    border-color: $blue-dark-500;
    color: $white;
  }
}
.models {
  position: relative;
  margin-bottom: 0.625rem;
  padding: 0 1.25rem;
  :deep(.swiper-button-prev),
  :deep(.swiper-button-next) {
    width: 1.25rem;
    height: 1.25rem;
    color: $blue-dark-500;
    &::after {
      font-size: 0.75rem;
    }
  }
  :deep(.swiper-button-disabled) {
    opacity: 0.35;
  }
}
.models__empty {
  font-size: 0.8125rem;
  color: $gray-100;
  margin-bottom: 0.625rem;
}
.model {
  @include flex(center, center, 0.5rem);
  flex-direction: column;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  &__thumb {
    width: 100%;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    border-radius: 8px;
    background: #eef1f7;
    color: $babyBlue;
    font-size: 1.75rem;
    border: 2px solid transparent;
    @include flex(center, center);
  }
  &__thumbImage {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  &__label {
    font-size: 0.75rem;
    line-height: 1.333;
    color: #606692;
  }
  &.isActive {
    .model__thumb {
      border-color: $blue;
    }
    .model__label {
      color: $blue-dark-500;
      font-weight: 700;
    }
  }
}
.link {
  font-size: 0.875rem;
  font-weight: 700;
  color: $blue-dark-500;
}
// ── 上傳模特照：拖曳區 ──
.mdrop {
  @include flex(center, center, 0.375rem);
  flex-direction: column;
  width: 100%;
  padding: 1.375rem 1rem;
  border: 1px dashed $gray;
  border-radius: 10px;
  background: $white;
  cursor: pointer;
  &:hover {
    border-color: $blue-dark-500;
  }
  &.isDisabled {
    cursor: default;
    opacity: 0.6;
  }
  &__input {
    display: none;
  }
  &__icon {
    font-size: 1.625rem;
    color: $blue-dark-500;
  }
  &__title {
    font-size: 0.8125rem;
    font-weight: 500;
    color: $blue-dark-500;
  }
  &__hint {
    font-size: 0.6875rem;
    color: $gray-100;
  }
}
.mtip {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  background: $blue-light;
  font-size: 0.6875rem;
  line-height: 1.5;
  color: #606692;
}
.uphead {
  @include flex(flex-start, center, 0.5rem);
  width: 100%;
  margin-top: 0.75rem;
  &__title {
    font-size: 0.8125rem;
    font-weight: 700;
    color: $blue-dark-500;
  }
  &__grow {
    flex: 1;
    height: 0.0625rem;
  }
  &__count {
    font-size: 0.6875rem;
    color: $gray-100;
  }
}
.uplist {
  @include flex(flex-start, stretch, 0.375rem);
  flex-direction: column;
  width: 100%;
  margin-top: 0.375rem;
}
.uprow {
  @include flex(flex-start, center, 0.625rem);
  padding: 0.5rem 0.625rem;
  border: 1px solid $gray;
  border-radius: 8px;
  background: $white;
  &.isActive {
    background: $blue-light;
    border-color: $blue;
  }
  &__pick {
    @include flex(flex-start, center, 0.625rem);
    flex: 1;
    min-width: 0;
    text-align: left;
  }
  &__thumb {
    @include flex(center, center);
    width: 2.25rem;
    height: 2.25rem;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
    background: #eef1f7;
    color: $babyBlue;
    font-size: 1.125rem;
  }
  &__thumbImage {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  &__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 500;
    color: $blue-dark-500;
  }
  &__del {
    @include flex(center, center);
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    color: $gray-100;
    font-size: 1rem;
    &:hover {
      color: $red;
    }
  }
}
.pconsent {
  @include flex(flex-start, center, 0.625rem);
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid $gray;
  border-radius: 8px;
  background: $white;
  cursor: pointer;
  &__check {
    flex: 1;
    font-size: 0.75rem;
    font-weight: 500;
    color: $blue-dark-500;
  }
  &__link {
    font-size: 0.75rem;
    font-weight: 500;
    color: $blue-dark-500;
  }
}
.dropzone {
  @include flex(center, center);
  flex-direction: column;
  aspect-ratio: 352 / 140;
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
    font-size: 0.8125rem;
    color: #606692;
    border: 1px solid $gray;
    border-radius: 16px;
    padding: 0.1875rem 0.75rem;
  }
}
.err {
  color: $red;
  font-size: 0.8125rem;
  margin: 0;
}
.tryon__sticky {
  margin: auto -1.5rem -1.5rem;
  padding: 0.875rem 1.5rem 1.5rem;
  border-top: 1px solid $gray;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  // 大螢幕（≥80.0625rem）：.tryon__input 改成 padding: 0（見上），.tryon__scroll 用 flex: 1 頂開，
  // 不再需要負 margin 抵銷面板留白，sticky footer 固定高不隨內容捲動（同 genimg__sticky／video__sticky 處理方式）
  @media (min-width: 80.0625rem) {
    margin: 0;
    flex-shrink: 0;
  }
}
.tryon__footer {
  @include flex(space-between, flex-end);
  margin: 0;
}
.cost {
  &__label {
    font-size: 0.75rem;
    color: $gray-100;
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
.result__head {
  @include flex(space-between, center);
  .result__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: $dark-blue-gray;
  }
  .result__hint {
    font-size: 0.8125rem;
    color: #606692;
    border: 1px solid $gray;
    border-radius: 16px;
    padding: 0.1875rem 0.75rem;
  }
}
.result__wrap {
  @include flex(center, center);
  flex: 1;
  min-height: 33.75rem;
  background: $blue-light;
  border-radius: 8px;
}
.result__box {
  @include flex(center, center);
  flex-direction: column;
  gap: 0.625rem;
  width: 100%;
  max-width: 22.5rem;
  aspect-ratio: 360 / 480;
  background: #e4e9f2;
  border-radius: 10px;
  overflow: hidden;
  color: #aeb8cc; // Figma node 841:618 (ph_video) 圖示實際色碼，比 $babyBlue 更偏灰藍
}
.result__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

// Figma 14:113：result_img 為 360 × 480，置於 638 × 606 的 result_wrap 中。
// 大螢幕讓內外兩層一起等比例縮放，避免外框變寬後影片仍停留在固定尺寸。
@media (min-width: 80.0625rem) {
  .tryon {
    height: 100%;
    min-height: 0;
  }

  .tryon__body,
  .tryon__input,
  .tryon__result {
    min-height: 0;
  }

  // 左側面板在這個斷點開始有確定高度（.tryon 的 height: 100% 一路往上接到
  // DefaultLayout 的 .content{overflow-y:auto}），但面板內容（已上傳模特清單、
  // 同意條款勾選等）沒有上限，過去在視窗高度不足時會直接溢出撐破版面。
  // 改成 .tryon__scroll(flex:1)／.tryon__steps(overflow-y:auto) 兩段式結構後，
  // 高度不夠時只在面板內部出現垂直捲軸（Y 軸），不再破圖。
  .tryon__input {
    height: 100%;
    padding: 0;
  }

  .tryon__steps {
    height: 100%;
    overflow-y: auto;
    padding: 1.5rem 1.5rem 0.75rem;
  }

  .result__wrap {
    align-self: center;
    flex: 1 1 0;
    width: auto;
    max-width: 100%;
    min-height: 0;
    aspect-ratio: 638 / 606;
  }

  .result__box {
    width: 56.426%;
    max-width: none;
  }
}
.result__play {
  width: 4rem;
  height: 4rem;
}
.tryon__result {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.result__actions {
  @include flex(center, center, 0.75rem);
}
.linkbtn {
  font-size: 0.875rem;
  color: #606692;
  padding: 0.5625rem 0.5rem;
  &:hover {
    color: $blue;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}
.cmodal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(23, 30, 82, 0.45);
  @include flex(center, center);
  padding: 1.5rem;
}
.cdialog {
  width: 35rem;
  max-width: 100%;
  background: $white;
  border-radius: 14px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0px 12px 16px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  &__head {
    @include flex(flex-start, center, 0.625rem);
  }
  &__alert {
    font-size: 1.375rem;
    color: $orange;
    flex-shrink: 0;
  }
  &__title {
    font-size: 1.0625rem;
    font-weight: 700;
    color: $blue-dark-500;
  }
  &__grow {
    flex: 1;
    height: 0.0625rem;
  }
  &__close {
    @include flex(center, center);
    flex-shrink: 0;
    width: 1.125rem;
    height: 1.125rem;
    font-size: 1.125rem;
    color: $gray-400;
    &:hover {
      color: $blue-dark-500;
    }
  }
  &__intro {
    font-size: 0.8125rem;
    color: #606692;
    line-height: 1.6;
  }
  &__act {
    @include flex(flex-start, center, 0.625rem);
  }
  &__foot {
    font-size: 0.6875rem;
    color: $gray-100;
    line-height: 1.5;
  }
}
.terms {
  display: flex;
  flex-direction: column;
  gap: 0.5625rem;
  padding: 0.875rem 1rem;
  border-radius: 10px;
  background: $blue-light;
  max-height: 14rem;
  overflow-y: auto;
  &__text {
    font-size: 0.75rem;
    line-height: 1.6;
    color: $blue-dark-500;
    white-space: pre-line; // 品牌設定的條款模板是多行純文字，保留換行
  }
}
.ack {
  display: flex;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  background: $blue-light;
  color: $blue-dark-500;
  font-size: 0.8125rem;
  font-weight: 500;
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
