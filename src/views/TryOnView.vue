<template lang="pug">
.tryon
  .consent-bar(v-if="!consented")
    i.ti.ti-alert-triangle.consent-bar__icon
    .consent-bar__text
      strong 上傳真人照片前，請確認已取得當事人肖像使用同意
      span 真人顧客照涉及個資與肖像權，使用前需完成同意流程；建議優先使用內建模特庫。
    OutlineButton(@click="showConsent = true") 查看同意條款

  .tryon__body
    section.panel.tryon__input
      .step
        .step__title 1. 選擇模特
        .subtabs
          button.subtab(v-for="s in modelTabs" :key="s" :class="{ 'is-active': modelTab === s }" @click="modelTab = s") {{ s }}
        template(v-if="modelTab === '內建模特庫'")
          .models
            button.model(v-for="m in models" :key="m" :class="{ 'is-active': model === m }" @click="model = m")
              span.model__thumb
                i.ti.ti-photo
              span.model__label {{ m }}
          button.link 檢視完整模特庫（內建 12 位）
        template(v-else)
          label.mdrop
            input.mdrop__input(type="file" accept="image/*" @change="onModelUpload")
            i.ti.ti-upload.mdrop__icon
            span.mdrop__title 拖曳模特照到這裡，或點擊上傳
            span.mdrop__hint JPG／PNG・單張 ≤ 10MB・建議 1024px 以上
          .mtip 建議全身正面、單一人物、背景單純；避免他人入鏡或大面積 logo，會影響合成品質。
          template(v-if="uploadedModels.length")
            .uphead
              span.uphead__title 已上傳模特
              span.uphead__grow
              span.uphead__count {{ uploadedModels.length }} / 20
            .uplist
              .uprow(v-for="u in uploadedModels" :key="u.id" :class="{ 'is-ok': u.status === 'available' }")
                span.uprow__thumb
                  i.ti.ti-photo
                .uprow__col
                  span.uprow__name {{ u.name }}
                  span.uprow__note(:class="{ 'is-warn': u.status !== 'available' }") {{ u.note }}
                span.statuspill(:class="u.status === 'available' ? 'is-ok' : 'is-reupload'") {{ u.status === 'available' ? '可用' : '需重傳' }}
                button.uprow__del(@click="removeModel(u.id)" aria-label="刪除")
                  i.ti.ti-trash
            label.pconsent
              span.pconsent__box(:class="{ 'is-on': personConsent }")
                i.ti.ti-check(v-if="personConsent")
              input.pconsent__input(type="checkbox" v-model="personConsent")
              span.pconsent__text 我已取得此人肖像使用同意
              button.pconsent__link(type="button" @click.prevent="showConsent = true") 查看條款
      .step
        .step__title 2. 選擇服飾素材
        .dropzone
          i.ti.ti-photo.dropzone__icon
          span.dropzone__name(v-if="apparel") {{ apparel.name }}
        .dropzone__actions
          OutlineButton(@click="pickerOpen = true") 從圖庫選擇
          span.dropzone__hint 建議先去背
      BrandToggle.tryon__brand(v-model="applyBrand" @edit="goBrandSettings")
      p.err(v-if="errorMsg") {{ errorMsg }}
      .tryon__footer
        .cost
          .cost__label 預估消耗
          .cost__value
            IconFeedBottleSmall.cost__icon
            span 12 顆飼料
        PrimaryButton(:disabled="generating" @click="onGenerate")
          i.ti.ti-loader.spin(v-if="generating")
          span {{ generating ? '生成中…' : '生成試穿圖' }}

    section.panel.tryon__result
      .result__head
        h2.result__title 試穿結果
        span.result__hint 多角度為進階選項
      .result__wrap
        .result__box
          IconPlayCircle.result__play
          span.result__placeholder(v-if="done") 試穿圖已生成
      .result__actions(v-if="done")
        OutlineButton(@click="saveResult") {{ savedId ? '已存入' : '存入圖庫' }}
        button.linkbtn(@click="download") 下載
        button.linkbtn(@click="onGenerate") 重新生成

  ImagePickerDialog(v-model:open="pickerOpen" title="選擇服飾素材" @select="onPick")

  Teleport(to="body")
    .cmodal(v-if="showConsent" @click.self="closeConsent")
      .cdialog
        .cdialog__head
          i.ti.ti-alert-triangle.cdialog__alert
          h3.cdialog__title 肖像權同意條款
          span.cdialog__grow
          button.cdialog__close(type="button" @click="closeConsent" aria-label="關閉")
            i.ti.ti-x
        p.cdialog__intro 以真人照片進行 AI 試穿前，必須先取得當事人的書面同意。以下為預設條款，可在「品牌資訊維護 › 合規與授權」修改後套用到所有試穿任務。
        .terms
          p.terms__item 一、本人同意品牌方將本人照片用於 AI 試穿圖像之生成、編輯與行銷素材製作。
          p.terms__item 二、生成結果僅限品牌方自有通路使用，不得轉授權第三方，亦不得用於暗示代言之情境。
          p.terms__item 三、本人得隨時以書面撤回同意；撤回後品牌方應於 30 日內停止使用並刪除相關素材。
          p.terms__item 四、品牌方應保存本同意書及生成紀錄至少 2 年，以備查核。
          p.terms__more （完整條款共 8 條，可捲動閱覽）
        label.ack
          span.ack__box(:class="{ 'is-on': ackChecked }")
            i.ti.ti-check(v-if="ackChecked")
          input.ack__input(type="checkbox" v-model="ackChecked")
          span.ack__text 我已取得當事人同意，並保留書面紀錄可供查核。
        .cdialog__act
          button.cdialog__pdf(type="button" @click="downloadTerms") 下載條款範本（PDF）
          span.cdialog__grow
          OutlineButton(@click="goCompliance") 前往合規設定
          PrimaryButton(:disabled="!ackChecked" @click="acknowledge") 我知道了
        p.cdialog__foot 未勾選確認前無法關閉並繼續；此紀錄會寫入該次試穿任務。
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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

const modelTabs = ['內建模特庫', '上傳模特照']
const modelTab = ref('內建模特庫')
const models = ['女·休閒', '男·正裝', '女·運動', '女·優雅']
const model = ref('女·休閒')

type UploadedModel = { id: string; name: string; status: 'available' | 'reupload'; note: string }
// 前端示範資料：對應設計稿「已上傳模特」兩種審核狀態；實際上傳會 push 新項目
const uploadedModels = ref<UploadedModel[]>([
  { id: 'demo-a', name: '模特_A_全身正面', status: 'available', note: '可用・已同意' },
  { id: 'demo-b', name: '模特_B_側身', status: 'reupload', note: '審核未過・背景有他人' },
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
  uploadedModels.value.push({ id: crypto.randomUUID(), name: f.name, status: 'available', note: '可用・已同意' })
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
  const a = await saveGenerated('試穿圖_' + Date.now())
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
    errorMsg.value = isInsufficientFeed(e) ? '飼料不足，請先儲值。' : '生成失敗，請再試一次。'
  } finally {
    generating.value = false
  }
}
</script>

<style scoped lang="scss">
.consent-bar {
  @include flex(flex-start, center, 10px);
  background: $blue-light;
  border-left: 3px solid $yellow;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 18px;
  &__icon {
    font-size: 20px;
    color: $orange;
    flex-shrink: 0;
  }
  &__text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    strong {
      font-size: 14px;
      font-weight: 500;
      color: $dark-blue-gray;
    }
    span {
      font-size: 13px;
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
  grid-template-columns: 400px 1fr;
  gap: 16px;
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
  padding: 24px;
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
.subtabs {
  @include flex(flex-start, center, 8px);
  margin-bottom: 14px;
}
.subtab {
  padding: 3px 12px;
  border-radius: 16px;
  font-size: 13px;
  color: #606692;
  border: 1px solid $gray;
  background: $white;
  &.is-active {
    background: $blue-dark-500;
    border-color: $blue-dark-500;
    color: $white;
  }
}
.models {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 10px;
  margin-bottom: 10px;
}
.model {
  @include flex(center, center, 8px);
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
    font-size: 28px;
    border: 2px solid transparent;
    @include flex(center, center);
  }
  &__label {
    font-size: 12px;
    line-height: 1.333;
    color: #606692;
  }
  &.is-active {
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
  font-size: 14px;
  font-weight: 700;
  color: $blue-dark-500;
}
// ── 上傳模特照：拖曳區 ──
.mdrop {
  @include flex(center, center, 6px);
  flex-direction: column;
  width: 100%;
  padding: 22px 16px;
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
    font-size: 26px;
    color: $blue-dark-500;
  }
  &__title {
    font-size: 13px;
    font-weight: 500;
    color: $blue-dark-500;
  }
  &__hint {
    font-size: 11px;
    color: $gray-100;
  }
}
.mtip {
  width: 100%;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: $blue-light;
  font-size: 11px;
  line-height: 1.5;
  color: #606692;
}
.uphead {
  @include flex(flex-start, center, 8px);
  width: 100%;
  margin-top: 12px;
  &__title {
    font-size: 13px;
    font-weight: 700;
    color: $blue-dark-500;
  }
  &__grow {
    flex: 1;
    height: 1px;
  }
  &__count {
    font-size: 11px;
    color: $gray-100;
  }
}
.uplist {
  @include flex(flex-start, stretch, 6px);
  flex-direction: column;
  width: 100%;
  margin-top: 6px;
}
.uprow {
  @include flex(flex-start, center, 10px);
  padding: 8px 10px;
  border: 1px solid $gray;
  border-radius: 8px;
  background: $white;
  &.is-ok {
    background: $blue-light;
    border-color: transparent;
  }
  &__thumb {
    @include flex(center, center);
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 8px;
    background: #eef1f7;
    color: $babyBlue;
    font-size: 18px;
  }
  &__col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  &__name {
    font-size: 12px;
    font-weight: 500;
    color: $blue-dark-500;
  }
  &__note {
    font-size: 11px;
    color: $gray-100;
    &.is-warn {
      color: $orange;
    }
  }
  &__del {
    @include flex(center, center);
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: $gray-100;
    font-size: 16px;
    &:hover {
      color: $red;
    }
  }
}
.statuspill {
  flex-shrink: 0;
  padding: 3px 12px;
  border-radius: 16px;
  font-size: 13px;
  background: $white;
  border: 1px solid $gray;
  &.is-ok {
    color: $green;
    border-color: $green;
  }
  &.is-reupload {
    color: #ff6148;
    border-color: #ff6148;
  }
}
.pconsent {
  @include flex(flex-start, center, 10px);
  width: 100%;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid $gray;
  border-radius: 8px;
  background: $white;
  cursor: pointer;
  &__input {
    display: none;
  }
  &__box {
    @include flex(center, center);
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    border-radius: 4px;
    border: 1px solid $gray;
    background: $white;
    color: $white;
    font-size: 11px;
    &.is-on {
      background: $blue-dark-500;
      border-color: $blue-dark-500;
    }
  }
  &__text {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
    color: $blue-dark-500;
  }
  &__link {
    font-size: 12px;
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
  font-size: 34px;
  margin-bottom: 12px;
  &__name {
    font-size: 13px;
    color: $gray-400;
    margin-top: 8px;
  }
  &__actions {
    @include flex(flex-start, center, 12px);
  }
  &__hint {
    font-size: 13px;
    color: #606692;
    border: 1px solid $gray;
    border-radius: 16px;
    padding: 3px 12px;
  }
}
.err {
  color: $red;
  font-size: 13px;
  margin-bottom: 12px;
}
.tryon__footer {
  @include flex(space-between, flex-end);
  border-top: 1px solid $gray;
  margin: auto -24px 0;
  padding: 14px 24px 0;
}
.cost {
  &__label {
    font-size: 12px;
    color: $gray-100;
  }
  &__value {
    @include flex(flex-start, center, 4px);
    font-size: 16px;
    font-weight: 700;
    color: $dark-blue-gray;
  }
  &__icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
}
.result__head {
  @include flex(space-between, center);
  .result__title {
    font-size: 18px;
    font-weight: 700;
    color: $dark-blue-gray;
  }
  .result__hint {
    font-size: 13px;
    color: #606692;
    border: 1px solid $gray;
    border-radius: 16px;
    padding: 3px 12px;
  }
}
.result__wrap {
  @include flex(center, center);
  flex: 1;
  min-height: 540px;
  background: $blue-light;
  border-radius: 8px;
}
.result__box {
  @include flex(center, center);
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 360px;
  aspect-ratio: 360 / 480;
  background: #e4e9f2;
  border-radius: 10px;
  color: $babyBlue;
}
.result__play {
  width: 64px;
  height: 64px;
}
.result__placeholder {
  font-size: 13px;
  color: $gray-100;
}
.tryon__result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tryon__brand {
  margin: 16px 0;
}
.result__actions {
  @include flex(center, center, 12px);
}
.linkbtn {
  font-size: 14px;
  color: #606692;
  padding: 9px 8px;
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
  padding: 24px;
}
.cdialog {
  width: 560px;
  max-width: 100%;
  background: $white;
  border-radius: 14px;
  padding: 20px 24px;
  box-shadow: 0px 12px 16px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 14px;
  &__head {
    @include flex(flex-start, center, 10px);
  }
  &__alert {
    font-size: 22px;
    color: $orange;
    flex-shrink: 0;
  }
  &__title {
    font-size: 17px;
    font-weight: 700;
    color: $blue-dark-500;
  }
  &__grow {
    flex: 1;
    height: 1px;
  }
  &__close {
    @include flex(center, center);
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    font-size: 18px;
    color: $gray-400;
    &:hover {
      color: $blue-dark-500;
    }
  }
  &__intro {
    font-size: 13px;
    color: #606692;
    line-height: 1.6;
  }
  &__act {
    @include flex(flex-start, center, 10px);
  }
  &__pdf {
    font-size: 13px;
    font-weight: 500;
    color: $blue-dark-500;
  }
  &__foot {
    font-size: 11px;
    color: $gray-100;
    line-height: 1.5;
  }
}
.terms {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 14px 16px;
  border-radius: 10px;
  background: $blue-light;
  &__item {
    font-size: 12px;
    line-height: 1.6;
    color: $blue-dark-500;
  }
  &__more {
    font-size: 11px;
    color: $gray-100;
  }
}
.ack {
  @include flex(flex-start, center, 10px);
  padding: 10px 12px;
  border-radius: 8px;
  background: $blue-light;
  cursor: pointer;
  &__input {
    display: none;
  }
  &__box {
    @include flex(center, center);
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    border-radius: 4px;
    border: 1px solid $gray;
    background: $white;
    color: $white;
    font-size: 11px;
    &.is-on {
      background: $blue-dark-500;
      border-color: $blue-dark-500;
    }
  }
  &__text {
    flex: 1;
    font-size: 13px;
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
