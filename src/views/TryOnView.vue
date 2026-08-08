<template lang="pug">
.tryon
  .consent-bar(v-if="!consented")
    i.ti.ti-alert-triangle
    .consent-bar__text
      strong 上傳真人照片前，請先完成肖像使用同意
      span 真人顧客涉及肖像與個資權；建議優先使用內建模特。同意一次即全站生效。
    button.consent-bar__btn(@click="showConsent = true") 查看同意條款

  .tryon__body
    section.panel.tryon__input
      .step
        .step__title 1. 選擇模特
        .subtabs
          button.subtab(v-for="s in modelTabs" :key="s" :class="{ 'is-active': modelTab === s }" @click="modelTab = s") {{ s }}
        template(v-if="modelTab === '內建模特庫'")
          .models
            button.model(v-for="m in models" :key="m" :class="{ 'is-active': model === m }" @click="model = m")
              span.model__avatar
                i.ti.ti-user
              span.model__label {{ m }}
          button.link 檢視完整模特庫（內建 12 位）
        template(v-else)
          label.modelupload
            input.modelupload__input(type="file" accept="image/*" @change="onModelUpload")
            i.ti(:class="uploadedModelName ? 'ti-user' : 'ti-upload'")
            span.modelupload__text {{ uploadedModelName || '上傳模特照片（JPG／PNG）' }}
          p.modelupload__hint 上傳真人照片需先完成肖像使用同意
      .step
        .step__title 2. 選擇服飾素材
        .dropzone
          i.ti.ti-hanger.dropzone__icon
          span.dropzone__name(v-if="apparel") {{ apparel.name }}
        .dropzone__actions
          GhostButton(@click="pickerOpen = true") 從圖庫選擇
          span.dropzone__hint 建議先去背
      BrandToggle.tryon__brand(v-model="applyBrand" @edit="goBrandSettings")
      p.err(v-if="errorMsg") {{ errorMsg }}
      .tryon__footer
        .cost
          .cost__label 預估消耗
          .cost__value 12 顆飼料
        PrimaryButton(:disabled="generating" @click="onGenerate")
          i.ti(:class="generating ? 'ti-loader spin' : ''")
          span {{ generating ? '生成中…' : '生成試穿' }}

    section.panel.tryon__result
      .result__head
        h2.result__title 試穿結果
        span.result__hint 多角度為進階選項
      .result__box
        template(v-if="done")
          i.ti.ti-user
          span.result__placeholder 試穿圖已生成
        template(v-else)
          i.ti.ti-user
          span.result__placeholder 選好模特與服飾後生成
      .result__actions(v-if="done")
        OutlineButton(@click="saveResult") {{ savedId ? '已存入' : '存入圖庫' }}
        button.linkbtn(@click="download") 下載
        button.linkbtn(@click="onGenerate") 重新生成

  ImagePickerDialog(v-model:open="pickerOpen" title="選擇服飾素材" @select="onPick")

  Teleport(to="body")
    .cmodal(v-if="showConsent" @click.self="showConsent = false")
      .cmodal__box
        h3.cmodal__title 肖像使用同意
        p.cmodal__text 上傳真人照片代表你已取得當事人同意，將其肖像用於 AI 試穿生成。同意一次即在此帳號全站生效，可於設定中撤回。
        .cmodal__actions
          DialogButton(@click="showConsent = false") 取消
          PrimaryButton(@click="agree") 我同意（全站一次生效）
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import GhostButton from '@/components/GhostButton.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import OutlineButton from '@/components/OutlineButton.vue'
import DialogButton from '@/components/DialogButton.vue'
import BrandToggle from '@/components/BrandToggle.vue'
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
const uploadedModelName = ref('')
const apparel = ref<Asset | null>(null)
const pickerOpen = ref(false)
const showConsent = ref(false)
const generating = ref(false)
const done = ref(false)
const errorMsg = ref('')
const applyBrand = ref(true)
const savedId = ref('')

onMounted(() => {
  consentStore.load()
})

const onPick = (a: Asset) => {
  apparel.value = a
}
const agree = async () => {
  await consentStore.give()
  showConsent.value = false
}
function onModelUpload(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  uploadedModelName.value = f.name
  // 上傳真人照片涉及肖像權，未同意先擋下要求完成肖像同意
  if (!consented.value) showConsent.value = true
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
  @include flex(flex-start, center, 12px);
  background: #faeeda;
  color: #854f0b;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 18px;
  i {
    font-size: 18px;
    flex-shrink: 0;
  }
  &__text {
    flex: 1;
    display: flex;
    flex-direction: column;
    strong {
      font-size: 14px;
    }
    span {
      font-size: 12.5px;
      color: #96601a;
    }
  }
  &__btn {
    border: 1px solid #ba7517;
    color: #854f0b;
    background: $white;
    border-radius: 999px;
    padding: 7px 14px;
    font-size: 13px;
    white-space: nowrap;
  }
}
.tryon__body {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 16px;
  align-items: start;
}
.panel {
  @include card;
  padding: 24px;
}
.step {
  margin-bottom: 22px;
  &__title {
    font-size: 15px;
    font-weight: 700;
    color: $blue-dark-300;
    margin-bottom: 12px;
  }
}
.subtabs {
  @include flex(flex-start, center, 8px);
  margin-bottom: 14px;
}
.subtab {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  color: $gray-400;
  border: 1px solid $gray;
  background: $white;
  &.is-active {
    background: $blue-dark-300;
    color: $white;
    border-color: $blue-dark-300;
  }
}
.models {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}
.model {
  @include flex(center, center, 6px);
  flex-direction: column;
  padding: 12px 4px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: $white;
  &__avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: $blue-light;
    color: $babyBlue;
    font-size: 22px;
    @include flex(center, center);
  }
  &__label {
    font-size: 12px;
    color: $gray-400;
  }
  &.is-active {
    border-color: $blue;
    .model__label {
      color: $blue-dark-300;
      font-weight: 600;
    }
  }
}
.link {
  font-size: 13px;
  color: $blue;
}
.modelupload {
  @include flex(center, center, 8px);
  flex-direction: column;
  aspect-ratio: 4 / 3;
  border: 1.5px dashed $gray;
  border-radius: 10px;
  background: $blue-light;
  color: $babyBlue;
  font-size: 30px;
  cursor: pointer;
  &:hover {
    border-color: $blue;
  }
  &__input {
    display: none;
  }
  &__text {
    font-size: 13px;
    color: $gray-400;
  }
}
.modelupload__hint {
  font-size: 12px;
  color: $gray-100;
  margin-top: 8px;
}
.dropzone {
  @include flex(center, center);
  flex-direction: column;
  aspect-ratio: 4 / 3;
  border: 1.5px dashed $gray;
  border-radius: 10px;
  background: $blue-light;
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
    font-size: 12px;
    color: $gray-100;
  }
}
.err {
  color: $red;
  font-size: 13px;
  margin-bottom: 12px;
}
.tryon__footer {
  @include flex(space-between, flex-end);
  border-top: 1px solid $lightGray;
  padding-top: 16px;
}
.cost {
  &__label {
    font-size: 12px;
    color: $gray-100;
  }
  &__value {
    font-size: 17px;
    font-weight: 700;
    color: $blue-dark-300;
  }
}
.result__head {
  @include flex(space-between, baseline);
  margin-bottom: 16px;
  .result__title {
    font-size: 18px;
    font-weight: 700;
    color: $blue-dark-300;
  }
  .result__hint {
    font-size: 12px;
    color: $gray-100;
  }
}
.result__box {
  @include flex(center, center);
  flex-direction: column;
  gap: 10px;
  aspect-ratio: 3 / 4;
  max-width: 320px;
  margin: 0 auto;
  background: $blue-light;
  border-radius: 12px;
  color: $babyBlue;
  font-size: 40px;
}
.result__placeholder {
  font-size: 13px;
  color: $gray-100;
}
.tryon__brand {
  margin-top: 16px;
}
.result__actions {
  @include flex(center, center, 8px);
  margin-top: 16px;
}
.linkbtn {
  font-size: 14px;
  color: $blue-dark-500;
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
.cmodal__box {
  width: 440px;
  max-width: 100%;
  background: $white;
  border-radius: 16px;
  padding: 24px;
}
.cmodal__title {
  font-size: 17px;
  font-weight: 700;
  color: $blue-dark-300;
  margin-bottom: 10px;
}
.cmodal__text {
  font-size: 14px;
  color: $gray-400;
  line-height: 1.6;
  margin-bottom: 18px;
}
.cmodal__actions {
  @include flex(flex-end, center, 10px);
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
