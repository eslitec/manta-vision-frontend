<template lang="pug">
.post
  section.panel.post__input
    .step
      .step__title 1. 選擇商品圖片
      .dropzone
        i.ti.ti-photo.dropzone__icon
        span.dropzone__name(v-if="productImage") {{ productImage.name }}
      .dropzone__actions
        OutlineButton(@click="pickerOpen = true") 從圖庫選擇
    .step
      .step__title 2. 商品介紹
      .field
        textarea.field__input(v-model="intro" maxlength="200" rows="4" placeholder="例：純棉透氣、五色可選、春夏新品限時 8 折…")
        span.field__counter {{ intro.length }} / 200
      .insp
        button.insp__pill(@click="inspOpen = !inspOpen") 探索靈感素材
        span.insp__hint 依商品類別給文案風格參考
    BrandToggle.post__brand(v-model="applyBrand" @edit="goBrandSettings")
    .step
      .step__title 3. 輸出比例
      .ratios
        button.ratiocard(v-for="r in ratios" :key="r.v" :class="{ 'is-active': ratio === r.v }" @click="ratio = r.v")
          span.ratiocard__label {{ r.label }}
          span.ratiocard__desc {{ r.desc }}
    p.err(v-if="errorMsg") {{ errorMsg }}
    .post__footer
      .cost
        .cost__label 預估消耗
        .cost__value
          IconFeedBottleSmall.cost__icon
          span 5 顆飼料
      PrimaryButton(:disabled="generating" @click="generate")
        i.ti(:class="generating ? 'ti-loader spin' : 'ti-plus'")
        span {{ generating ? '生成中…' : '產生貼文' }}

  section.panel.post__result
    h2.result__title 生成結果
    .result__empty(v-if="!result") 生成後貼圖與文案會顯示在這裡
    template(v-else)
      .postresult
        .postresult__col
          .poster(:style="{ aspectRatio: aspect }")
            i.ti.ti-photo
          .postresult__act
            button.linkbtn(@click="generate") 換一張圖
            button.linkbtn(@click="downloadPoster") 下載
        .postresult__col
          .copy
            p.copy__text(v-for="(line, i) in copyLines" :key="i") {{ line }}
            p.copy__tags {{ result.hashtags.join(' ') }}
          .postresult__act
            OutlineButton(@click="copyText")
              i.ti.ti-copy
              span {{ copied ? '已複製' : '複製文案' }}
            button.linkbtn(@click="generate") 重寫文案
      .postresult__note
        i.ti.ti-alert-triangle.postresult__note-icon
        span 下一步：一鍵帶入群發訊息草稿（需與主產品介接，roadmap 項目）

  ImagePickerDialog(v-model:open="pickerOpen" title="選擇商品圖片" @select="onPick")
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import OutlineButton from '@/components/OutlineButton.vue'
import BrandToggle from '@/components/BrandToggle.vue'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import { useFeedStore } from '@/stores/feed'
import { api } from '@/api'
import { isInsufficientFeed } from '@/utils/error'
import type { Asset, GeneratedPost } from '@/types/api'

const router = useRouter()
const feed = useFeedStore()

const productImage = ref<Asset | null>(null)
const intro = ref('')
const applyBrand = ref(true)
const inspOpen = ref(false)
const pickerOpen = ref(false)
const generating = ref(false)
const errorMsg = ref('')
const result = ref<GeneratedPost | null>(null)
const copied = ref(false)

// 輸出比例（生成前於設定區選定，影響構圖與結果預覽比例）
const ratios = [
  { v: '1:1', label: '1:1', desc: '貼文', ar: '1 / 1' },
  { v: '16:9', label: '16:9', desc: '橫幅', ar: '16 / 9' },
  { v: '9:16', label: '9:16', desc: '限動 / Reels', ar: '9 / 16' },
]
const ratio = ref('1:1')
const aspect = computed(() => ratios.find((r) => r.v === ratio.value)?.ar ?? '1 / 1')

const goBrandSettings = () => router.push('/settings')
const copyLines = computed(() => (result.value ? result.value.copy.split('\n\n') : []))
const onPick = (a: Asset) => {
  productImage.value = a
}

async function generate() {
  errorMsg.value = ''
  generating.value = true
  copied.value = false
  try {
    result.value = await api.generatePost({
      productImageId: productImage.value?.id,
      intro: intro.value,
      applyBrand: applyBrand.value,
      ratio: ratio.value, // 版位比例一併送給後端，影響構圖
    })
    await feed.refresh()
  } catch (e: unknown) {
    errorMsg.value = isInsufficientFeed(e) ? '飼料不足，請先儲值。' : '生成失敗，請再試一次。'
  } finally {
    generating.value = false
  }
}
function downloadPoster() {
  // TODO: 後端回傳 posterUrl 後觸發實際下載
  if (result.value?.posterUrl) window.open(result.value.posterUrl, '_blank')
}
async function copyText() {
  if (!result.value) return
  const text = result.value.copy + '\n\n' + result.value.hashtags.join(' ')
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
  } catch {
    /* noop */
  }
}
</script>

<style scoped lang="scss">
.post { display: grid; grid-template-columns: 400px 1fr; gap: 16px; align-items: stretch; min-height: 100%;
  @include below($bp-lg) { grid-template-columns: 1fr; } }
.panel { background: $white; border-radius: 10px; box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2); padding: 24px; }
.post__input { display: flex; flex-direction: column; }
.step { margin-bottom: 16px; &__title { font-size: 16px; font-weight: 700; color: $dark-blue-gray; margin-bottom: 12px; } }
.dropzone { @include flex(center, center); flex-direction: column; aspect-ratio: 352 / 170; border-radius: 8px; background: #eef1f7; color: $babyBlue; font-size: 34px; margin-bottom: 12px;
  &__name { font-size: 13px; color: $gray-400; margin-top: 8px; } &__actions { @include flex(flex-start, center, 12px); } &__hint { font-size: 12px; color: #b4b9c4; } }
.field { position: relative;
  &__input { width: 100%; border: none; border-radius: 8px; padding: 12px 14px; font-size: 14px; font-family: inherit; color: $blue-dark-300; resize: vertical; outline: none; background: $blue-light;
    &::placeholder { color: #b4b9c4; } }
  &__counter { position: absolute; right: 12px; bottom: 8px; font-size: 12px; font-weight: 500; color: $orange; } }
.insp { @include flex(flex-start, center, 8px); margin-top: 10px;
  &__pill { padding: 3px 12px; border-radius: 16px; font-size: 13px; color: $dark-blue-gray; background: #f6eac1; }
  &__hint { font-size: 12px; color: $gray-100; } }
.post__brand { margin: 16px 0; }
.ratios { @include flex(flex-start, stretch, 8px); flex-wrap: wrap; }
.ratiocard { @include flex(center, center, 2px); flex-direction: column; width: 112px; height: 60px; padding: 10px; border: 1px solid #d2d5dd; border-radius: 8px; background: $white;
  &__label { font-size: 16px; font-weight: 700; line-height: 1.375; color: $dark-blue-gray; }
  &__desc { font-size: 12px; line-height: 1.333; color: #606692; }
  &.is-active { background: $blue-light; border: 1.5px solid $blue-dark-500;
    .ratiocard__label { color: $blue-dark-500; } } }
.err { color: $red; font-size: 13px; margin: 8px 0; }
.post__footer { @include flex(space-between, flex-end); border-top: 1px solid $gray; margin: auto -24px 0; padding: 14px 24px 0; }
.cost { &__label { font-size: 12px; color: #b4b9c4; } &__value { @include flex(flex-start, center, 4px); font-size: 16px; font-weight: 700; color: $dark-blue-gray; } &__icon { width: 16px; height: 16px; flex-shrink: 0; } }
.post__result { display: flex; flex-direction: column; gap: 16px; }
.result__title { font-size: 18px; font-weight: 700; color: $dark-blue-gray; margin-bottom: 0; }
.result__empty { color: $gray-100; font-size: 14px; padding: 40px 0; text-align: center; }
.postresult { @include flex(flex-start, flex-start, 20px);
  @include below($bp-sm) { flex-direction: column; } }
.postresult__col { display: flex; flex-direction: column;
  &:first-child { width: 300px; flex-shrink: 0; gap: 8px; }
  &:last-child { flex: 1; min-width: 0; gap: 12px; }
  @include below($bp-sm) { &:first-child { width: 100%; } } }
.postresult__act { @include flex(flex-start, center, 12px); }
.postresult__note { @include flex(flex-start, center, 10px); background: $blue-light; border-left: 3px solid $babyBlue; border-radius: 8px; padding: 12px 14px; font-size: 14px; font-weight: 500; color: $dark-blue-gray; line-height: 1.5;
  &-icon { color: $babyBlue; font-size: 18px; flex-shrink: 0; } }
.poster { @include flex(center, center); background: #eef1f7; border-radius: 8px; color: $babyBlue; font-size: 44px; width: 100%; }
.copy { background: $blue-light; border-radius: 8px; padding: 16px; width: 100%;
  &__text { font-size: 16px; color: $dark-blue-gray; line-height: 1.375; margin-bottom: 8px; } &__tags { font-size: 16px; line-height: 1.375; color: $dark-blue-gray; } }
.linkbtn { font-size: 14px; color: #606692; padding: 0; &:hover { color: $blue-dark-500; } }
.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
</style>
