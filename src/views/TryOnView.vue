<template lang="pug">
.tryon
  .consentBar(v-if="!consented")
    i.ti.ti-alert-triangle.consentBar__icon
    .consentBar__text
      strong {{ t('tryOn.consentBanner.title') }}
      span {{ t('tryOn.consentBanner.description') }}
    OutlineButton(@click="showConsent = true") {{ t('tryOn.consentBanner.action') }}

  .tryon__body
    section.panel.tryon__input
      .step
        .step__title {{ t('tryOn.steps.model') }}
        .subtabs
          button.subtab(v-for="s in modelTabs" :key="s.value" :class="{ 'isActive': modelTab === s.value }" @click="modelTab = s.value") {{ s.label }}
        template(v-if="modelTab === 'builtIn'")
          .models
            button.model(v-for="m in models" :key="m.value" :class="{ 'isActive': model === m.value }" @click="model = m.value")
              span.model__thumb
                i.ti.ti-photo
              span.model__label {{ m.label }}
          button.link {{ t('tryOn.viewFullLibrary') }}
        template(v-else)
          label.mdrop
            input.mdrop__input(type="file" accept="image/*" @change="onModelUpload")
            i.ti.ti-upload.mdrop__icon
            span.mdrop__title {{ t('tryOn.upload.title') }}
            span.mdrop__hint {{ t('tryOn.upload.hint') }}
          .mtip {{ t('tryOn.upload.recommendation') }}
          template(v-if="uploadedModels.length")
            .uphead
              span.uphead__title {{ t('tryOn.uploadedModels') }}
              span.uphead__grow
              span.uphead__count {{ uploadedModels.length }} / 20
            .uplist
              .uprow(v-for="u in uploadedModels" :key="u.id" :class="{ 'isOk': u.status === 'available' }")
                span.uprow__thumb
                  i.ti.ti-photo
                .uprow__col
                  span.uprow__name {{ u.name }}
                  span.uprow__note(:class="{ 'isWarn': u.status !== 'available' }") {{ t(`tryOn.upload.notes.${u.noteKey}`) }}
                span.statuspill(:class="u.status === 'available' ? 'isOk' : 'isReupload'") {{ u.status === 'available' ? t('tryOn.upload.available') : t('tryOn.upload.reupload') }}
                button.uprow__del(@click="removeModel(u.id)" :aria-label="t('common.delete')")
                  i.ti.ti-trash
            label.pconsent
              span.pconsent__box(:class="{ 'isOn': personConsent }")
                i.ti.ti-check(v-if="personConsent")
              input.pconsent__input(type="checkbox" v-model="personConsent")
              span.pconsent__text {{ t('tryOn.personConsent') }}
              button.pconsent__link(type="button" @click.prevent="showConsent = true") {{ t('tryOn.viewTerms') }}
      .step
        .step__title {{ t('tryOn.steps.apparel') }}
        .dropzone
          i.ti.ti-photo.dropzone__icon
          span.dropzone__name(v-if="apparel") {{ apparel.name }}
        .dropzone__actions
          OutlineButton(@click="pickerOpen = true") {{ t('common.selectFromLibrary') }}
          span.dropzone__hint {{ t('tryOn.removeBackgroundHint') }}
      BrandToggle.tryon__brand(v-model="applyBrand" @edit="goBrandSettings")
      p.err(v-if="errorMsg") {{ errorMsg }}
      .tryon__footer
        .cost
          .cost__label {{ t('common.estimatedCost') }}
          .cost__value
            IconFeedBottleSmall.cost__icon
            span {{ t('units.feed', { count: 12 }) }}
        PrimaryButton(:disabled="generating" @click="onGenerate")
          i.ti.ti-loader.spin(v-if="generating")
          span {{ generating ? t('common.generating') : t('tryOn.generate') }}

    section.panel.tryon__result
      .result__head
        h2.result__title {{ t('tryOn.resultTitle') }}
        span.result__hint {{ t('tryOn.resultHint') }}
      .result__wrap
        .result__box
          IconPlayCircle.result__play
          span.result__placeholder(v-if="done") {{ t('tryOn.generated') }}
      .result__actions(v-if="done")
        OutlineButton(@click="saveResult") {{ savedId ? t('common.saved') : t('common.saveToLibrary') }}
        button.linkbtn(@click="download") {{ t('common.download') }}
        button.linkbtn(@click="onGenerate") {{ t('common.regenerate') }}

  ImagePickerDialog(v-model:open="pickerOpen" :title="t('tryOn.pickerTitle')" @select="onPick")

  Teleport(to="body")
    .cmodal(v-if="showConsent" @click.self="closeConsent")
      .cdialog
        .cdialog__head
          i.ti.ti-alert-triangle.cdialog__alert
          h3.cdialog__title {{ t('tryOn.terms.title') }}
          span.cdialog__grow
          button.cdialog__close(type="button" @click="closeConsent" :aria-label="t('common.close')")
            i.ti.ti-x
        p.cdialog__intro {{ t('tryOn.terms.intro') }}
        .terms
          p.terms__item(v-for="(term, index) in tm('tryOn.terms.items')" :key="index") {{ term }}
          p.terms__more {{ t('tryOn.terms.more') }}
        label.ack
          span.ack__box(:class="{ 'isOn': ackChecked }")
            i.ti.ti-check(v-if="ackChecked")
          input.ack__input(type="checkbox" v-model="ackChecked")
          span.ack__text {{ t('tryOn.terms.acknowledgement') }}
        .cdialog__act
          button.cdialog__pdf(type="button" @click="downloadTerms") {{ t('tryOn.terms.download') }}
          span.cdialog__grow
          OutlineButton(@click="goCompliance") {{ t('tryOn.terms.openCompliance') }}
          PrimaryButton(:disabled="!ackChecked" @click="acknowledge") {{ t('tryOn.terms.understand') }}
        p.cdialog__foot {{ t('tryOn.terms.footer') }}
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import OutlineButton from '@/components/OutlineButton.vue'
import BrandToggle from '@/components/BrandToggle.vue'
import IconPlayCircle from '@/components/icons/IconPlayCircle.vue'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import { useConsentStore } from '@/stores/consent'
import { useFeedStore } from '@/stores/feed'
import { useAssets } from '@/composables/useAssets'
import { api } from '@/api'
import { isInsufficientFeed } from '@/utils/error'
import type { Asset } from '@/types/api'

const router = useRouter()
const consentStore = useConsentStore()
const { consented } = storeToRefs(consentStore)
const feed = useFeedStore()
const { saveGenerated } = useAssets()
const { t, tm } = useI18n()

const modelTabs = computed(() => [
  { value: 'builtIn', label: t('tryOn.tabs.builtIn') },
  { value: 'upload', label: t('tryOn.tabs.upload') },
])
const modelTab = ref('builtIn')
const models = computed(() =>
  ['femaleCasual', 'maleFormal', 'femaleSport', 'femaleElegant'].map((value) => ({
    value,
    label: t(`tryOn.models.${value}`),
  })),
)
const model = ref('femaleCasual')

type UploadedModel = { id: string; name: string; status: 'available' | 'reupload'; noteKey: string }
// 前端示範資料：對應設計稿「已上傳模特」兩種審核狀態；實際上傳會 push 新項目
const uploadedModels = ref<UploadedModel[]>([
  { id: 'demo-a', name: t('tryOn.demoModels.a'), status: 'available', noteKey: 'consented' },
  { id: 'demo-b', name: t('tryOn.demoModels.b'), status: 'reupload', noteKey: 'backgroundPeople' },
])
const personConsent = ref(true) // 面板「我已取得此人肖像使用同意」勾選
const ackChecked = ref(false) // 對話框「我已取得當事人同意…」勾選

const apparel = ref<Asset | null>(null)
const pickerOpen = ref(false)
const showConsent = ref(false)
const generating = ref(false)
const done = ref(false)
const errorMsg = ref('')
const applyBrand = ref(false)
const savedId = ref('')

onMounted(() => {
  consentStore.load()
})

const onPick = (a: Asset) => {
  apparel.value = a
}
function onModelUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  uploadedModels.value.push({ id: crypto.randomUUID(), name: f.name, status: 'available', noteKey: 'consented' })
  input.value = '' // 允許重複選同一檔
  // 上傳真人照片涉及肖像權，未同意先擋下要求完成肖像同意
  if (!consented.value) showConsent.value = true
}
function removeModel(id: string) {
  uploadedModels.value = uploadedModels.value.filter((m) => m.id !== id)
}
function closeConsent() {
  showConsent.value = false
}
async function acknowledge() {
  if (!ackChecked.value) return // 未勾選確認前不可繼續
  await consentStore.give()
  personConsent.value = true
  showConsent.value = false
}
const goCompliance = () => router.push('/settings')
function downloadTerms() {
  // TODO: 後端提供條款範本 PDF 後觸發下載
}
const goBrandSettings = () => router.push('/settings')
async function saveResult() {
  if (savedId.value) return
  const a = await saveGenerated(t('tryOn.savedName', { timestamp: Date.now() }))
  savedId.value = a.id
}
function download() {
  // TODO: 後端回傳試穿圖 URL 後觸發實際下載
}

async function onGenerate() {
  if (!consented.value) {
    showConsent.value = true
    return
  } // 未同意 → 擋住並要求同意
  errorMsg.value = ''
  generating.value = true
  done.value = false
  savedId.value = ''
  try {
    await api.tryOn()
    await feed.refresh()
    done.value = true
  } catch (e: unknown) {
    errorMsg.value = isInsufficientFeed(e) ? t('errors.insufficientFeed') : t('errors.generationFailed')
  } finally {
    generating.value = false
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
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem 0.625rem;
  margin-bottom: 0.625rem;
}
.model {
  @include flex(center, center, 0.5rem);
  flex-direction: column;
  padding: 0;
  border: none;
  background: transparent;
  &__thumb {
    width: 100%;
    aspect-ratio: 4 / 5;
    border-radius: 8px;
    background: #eef1f7;
    color: $babyBlue;
    font-size: 1.75rem;
    border: 2px solid transparent;
    @include flex(center, center);
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
  &.isOk {
    background: $blue-light;
    border-color: transparent;
  }
  &__thumb {
    @include flex(center, center);
    width: 2.25rem;
    height: 2.25rem;
    flex-shrink: 0;
    border-radius: 8px;
    background: #eef1f7;
    color: $babyBlue;
    font-size: 1.125rem;
  }
  &__col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  &__name {
    font-size: 0.75rem;
    font-weight: 500;
    color: $blue-dark-500;
  }
  &__note {
    font-size: 0.6875rem;
    color: $gray-100;
    &.isWarn {
      color: $orange;
    }
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
.statuspill {
  flex-shrink: 0;
  padding: 0.1875rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8125rem;
  background: $white;
  border: 1px solid $gray;
  &.isOk {
    color: $green;
    border-color: $green;
  }
  &.isReupload {
    color: #ff6148;
    border-color: #ff6148;
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
  &__input {
    display: none;
  }
  &__box {
    @include flex(center, center);
    width: 1.125rem;
    height: 1.125rem;
    flex-shrink: 0;
    border-radius: 4px;
    border: 1px solid $gray;
    background: $white;
    color: $white;
    font-size: 0.6875rem;
    &.isOn {
      background: $blue-dark-500;
      border-color: $blue-dark-500;
    }
  }
  &__text {
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
  margin-bottom: 0.75rem;
}
.tryon__footer {
  @include flex(space-between, flex-end);
  border-top: 1px solid $gray;
  margin: auto -1.5rem 0;
  padding: 0.875rem 1.5rem 0;
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
  color: $babyBlue;
}
.result__play {
  width: 4rem;
  height: 4rem;
}
.result__placeholder {
  font-size: 0.8125rem;
  color: $gray-100;
}
.tryon__result {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.tryon__brand {
  margin: 1rem 0;
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
  &__pdf {
    font-size: 0.8125rem;
    font-weight: 500;
    color: $blue-dark-500;
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
  &__item {
    font-size: 0.75rem;
    line-height: 1.6;
    color: $blue-dark-500;
  }
  &__more {
    font-size: 0.6875rem;
    color: $gray-100;
  }
}
.ack {
  @include flex(flex-start, center, 0.625rem);
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  background: $blue-light;
  cursor: pointer;
  &__input {
    display: none;
  }
  &__box {
    @include flex(center, center);
    width: 1.125rem;
    height: 1.125rem;
    flex-shrink: 0;
    border-radius: 4px;
    border: 1px solid $gray;
    background: $white;
    color: $white;
    font-size: 0.6875rem;
    &.isOn {
      background: $blue-dark-500;
      border-color: $blue-dark-500;
    }
  }
  &__text {
    flex: 1;
    font-size: 0.8125rem;
    font-weight: 500;
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
