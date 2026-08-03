<template lang="pug">
.post
  section.panel.post__input
    .step
      .step__title 1. 選擇商品圖片
      .dropzone
        i.ti.ti-photo.dropzone__icon
        span.dropzone__name(v-if="productImage") {{ productImage.name }}
      .dropzone__actions
        button.btn-outline(@click="pickerOpen = true") 從圖庫選擇
        span.dropzone__hint 或拖曳上傳（賣什麼放什麼）
    .step
      .step__title 2. 商品介紹
      textarea.textarea(v-model="intro" rows="4" placeholder="例：純棉短T，透氣親膚，五種色，主打春夏日常穿搭…")
    label.brand
      span.brand__label 套用品牌設定
      span.switch(:class="{ 'is-on': applyBrand }" @click="applyBrand = !applyBrand")
        span.switch__dot
    p.brand__hint 自動帶入品牌語氣、稱呼、常用 hashtag，並避開避免用詞。
    p.err(v-if="errorMsg") {{ errorMsg }}
    .post__footer
      .cost
        .cost__label 預估消耗
        .cost__value 12 顆飼料
      button.btn-primary(:disabled="generating" @click="generate")
        i.ti(:class="generating ? 'ti-loader spin' : 'ti-sparkles'")
        span {{ generating ? '生成中…' : '生成貼文' }}

  section.panel.post__result
    .result__head
      h2.result__title 生成結果
      .modes(v-if="result")
        button.mode(:class="{ 'is-on': view === 'poster' }" @click="view = 'poster'") 海報
        button.mode(:class="{ 'is-on': view === 'feed' }" @click="view = 'feed'") 版位預覽
    .result__empty(v-if="!result") 生成後貼圖與文案會顯示在這裡
    template(v-else)
      .ratios
        span.ratios__label 版位比例
        button.ratio(v-for="r in ratios" :key="r.v" :class="{ 'is-on': ratio === r.v }" @click="ratio = r.v") {{ r.label }}

      //- 海報模式：圖 + 文案分開
      template(v-if="view === 'poster'")
        .poster(:style="{ aspectRatio: aspect }")
          i.ti.ti-photo
          span.poster__tag 形象貼圖・廣告海報風
        .poster__actions
          button.chip-dark(@click="savePoster") {{ savedId ? '已存入' : '存入圖庫' }}
          button.chip-plain(@click="downloadPoster") 下載
          button.chip-plain(@click="generate") 重生成
        .copy
          p.copy__text(v-for="(line, i) in copyLines" :key="i") {{ line }}
          p.copy__tags {{ result.hashtags.join(' ') }}
        .copy__actions
          button.chip-dark(@click="copyText")
            i.ti.ti-copy
            span {{ copied ? '已複製' : '複製文案' }}
          button.chip-plain(@click="generate")
            i.ti.ti-refresh
            span 重寫文案

      //- 版位預覽：模擬 IG 貼文在動態牆的樣子
      template(v-else)
        .igcard
          .igcard__head
            span.igcard__avatar
            .igcard__id
              strong {{ brandName }}
              small 贊助
            i.ti.ti-dots.igcard__more
          .igcard__media(:style="{ aspectRatio: aspect }")
            i.ti.ti-photo
          .igcard__bar
            .igcard__left
              i.ti.ti-heart
              i.ti.ti-message-circle
              i.ti.ti-send
            i.ti.ti-bookmark
          .igcard__caption
            span.igcard__name {{ brandName }}
            span.igcard__text  {{ result.copy }}
            p.igcard__tags {{ result.hashtags.join(' ') }}
        .poster__actions
          button.chip-dark(@click="savePoster") {{ savedId ? '已存入' : '存入圖庫' }}
          button.chip-plain(@click="downloadPoster") 下載
          button.chip-plain(@click="copyText") {{ copied ? '已複製' : '複製整篇' }}

  ImagePickerDialog(v-model:open="pickerOpen" title="選擇商品圖片" @select="onPick")
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import { useFeedStore } from '@/stores/feed'
import { useBrandStore } from '@/stores/brand'
import { useAssets } from '@/composables/useAssets'
import { api } from '@/api'
import { isInsufficientFeed } from '@/utils/error'
import type { Asset, GeneratedPost } from '@/types/api'

const feed = useFeedStore()
const brandStore = useBrandStore()
const { profile } = storeToRefs(brandStore)
const { saveGenerated } = useAssets()

const productImage = ref<Asset | null>(null)
const intro = ref('')
const applyBrand = ref(true)
const pickerOpen = ref(false)
const generating = ref(false)
const errorMsg = ref('')
const result = ref<GeneratedPost | null>(null)
const savedId = ref('')
const copied = ref(false)

// 結果呈現：海報 / IG 版位預覽 + 版位比例
const view = ref<'poster' | 'feed'>('poster')
const ratios = [
  { v: '1:1', label: '1:1', ar: '1 / 1' },
  { v: '4:5', label: '4:5', ar: '4 / 5' },
  { v: '9:16', label: '9:16', ar: '9 / 16' },
  { v: '16:9', label: '16:9', ar: '16 / 9' },
]
const ratio = ref('1:1')
const aspect = computed(() => ratios.find((r) => r.v === ratio.value)?.ar ?? '1 / 1')
const brandName = computed(() => profile.value?.name || '日安選物')

onMounted(brandStore.load)

const copyLines = computed(() => (result.value ? result.value.copy.split('\n\n') : []))

const onPick = (a: Asset) => { productImage.value = a }

async function generate() {
  errorMsg.value = ''
  generating.value = true
  savedId.value = ''
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
async function savePoster() {
  if (savedId.value) return
  const a = await saveGenerated('PO文貼圖_' + Date.now())
  savedId.value = a.id
}
function downloadPoster() {
  // TODO: 後端回傳 posterUrl 後觸發實際下載；PO 文不計採用（採用只算圖生圖）
  if (result.value?.posterUrl) window.open(result.value.posterUrl, '_blank')
}
async function copyText() {
  if (!result.value) return
  const text = result.value.copy + '\n\n' + result.value.hashtags.join(' ')
  try { await navigator.clipboard.writeText(text); copied.value = true } catch { /* noop */ }
}
</script>

<style scoped lang="scss">
.post { display: grid; grid-template-columns: 380px 1fr; gap: 20px; align-items: start; }
.panel { @include card; padding: 22px; }
.step { margin-bottom: 20px; &__title { font-size: 15px; font-weight: 700; color: $blue-dark-300; margin-bottom: 12px; } }
.dropzone { @include flex(center, center); flex-direction: column; aspect-ratio: 4 / 3; border: 1.5px dashed $gray; border-radius: 10px; background: $blue-light; color: $babyBlue; font-size: 34px; margin-bottom: 12px;
  &__name { font-size: 13px; color: $gray-400; margin-top: 8px; } &__actions { @include flex(flex-start, center, 12px); } &__hint { font-size: 12px; color: $gray-100; } }
.textarea { width: 100%; border: 1px solid $gray; border-radius: 10px; padding: 12px 14px; font-size: 14px; font-family: inherit; color: $blue-dark-300; resize: vertical; outline: none;
  &::placeholder { color: $gray-100; } &:focus { border-color: $blue; } }
.brand { @include flex(space-between, center); margin-top: 4px; &__label { font-size: 14px; color: $blue-dark-300; } &__hint { font-size: 12px; color: $gray-100; margin-top: 6px; } }
.switch { width: 42px; height: 24px; border-radius: 999px; background: $gray; position: relative; transition: background .15s; flex-shrink: 0;
  &__dot { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: $white; transition: transform .15s; }
  &.is-on { background: $blue; } &.is-on .switch__dot { transform: translateX(18px); } }
.err { color: $red; font-size: 13px; margin: 8px 0; }
.post__footer { @include flex(space-between, flex-end); border-top: 1px solid $lightGray; padding-top: 16px; margin-top: 18px; }
.cost { &__label { font-size: 12px; color: $gray-100; } &__value { font-size: 17px; font-weight: 700; color: $blue-dark-300; } }
.btn-outline { border: 1px solid $gray; border-radius: 999px; padding: 8px 16px; font-size: 14px; color: $blue-dark-300; background: $white; &:hover { border-color: $blue; } }
.btn-primary { @include flex(center, center, 6px); background: $blue-dark-300; color: $white; font-weight: 600; padding: 11px 20px; border-radius: 10px; font-size: 14px; box-shadow: $btnBoxShadow; &:disabled { opacity: .5; } }
.result__head { @include flex(space-between, center); margin-bottom: 16px; }
.result__title { font-size: 18px; font-weight: 700; color: $blue-dark-300; }
.result__empty { color: $gray-100; font-size: 14px; padding: 40px 0; text-align: center; }
.modes { @include flex(flex-start, center, 0); border: 1px solid $gray; border-radius: 999px; overflow: hidden; }
.mode { padding: 6px 14px; font-size: 13px; color: $gray-400; background: $white;
  &.is-on { background: $blue-dark-300; color: $white; } }
.ratios { @include flex(flex-start, center, 8px); margin-bottom: 14px; flex-wrap: wrap;
  &__label { font-size: 12px; color: $gray-100; margin-right: 2px; } }
.ratio { padding: 5px 12px; border-radius: 999px; font-size: 13px; border: 1px solid $gray; background: $white; color: $gray-400;
  &.is-on { background: $blue-light; color: $blue-dark-300; border-color: $babyBlue; font-weight: 600; } }
.poster { @include flex(center, center); flex-direction: column; position: relative; max-width: 320px; margin: 0 auto 12px; background: $blue-light; border-radius: 12px; color: $babyBlue; font-size: 36px;
  &__tag { font-size: 12px; color: $gray-100; margin-top: 8px; } &__actions { @include flex(center, center, 8px); margin-bottom: 20px; } }
.igcard { max-width: 360px; margin: 0 auto 14px; border: 1px solid $gray; border-radius: 12px; overflow: hidden; background: $white;
  &__head { @include flex(flex-start, center, 8px); padding: 10px 12px; }
  &__avatar { width: 30px; height: 30px; border-radius: 50%; background: $babyBlue; flex-shrink: 0; }
  &__id { flex: 1; display: flex; flex-direction: column; line-height: 1.2;
    strong { font-size: 13px; color: $blue-dark-300; } small { font-size: 11px; color: $gray-100; } }
  &__more { color: $gray-400; }
  &__media { @include flex(center, center); background: $blue-light; color: $babyBlue; font-size: 40px; }
  &__bar { @include flex(space-between, center); padding: 10px 12px; color: $blue-dark-300; font-size: 20px;
    .igcard__left { @include flex(flex-start, center, 12px); } }
  &__caption { padding: 0 12px 14px; font-size: 13px; line-height: 1.6; color: $blue-dark-300; }
  &__name { font-weight: 700; margin-right: 6px; }
  &__text { white-space: pre-line; }
  &__tags { color: $link-blue; margin-top: 6px; } }
.copy { @include card; background: $blue-light; border: none; padding: 16px 18px; max-width: 320px; margin: 0 auto;
  &__text { font-size: 14px; color: $blue-dark-300; line-height: 1.7; margin-bottom: 8px; } &__tags { font-size: 14px; color: $link-blue; } &__actions { @include flex(center, center, 8px); margin-top: 12px; } }
.chip-dark { @include flex(center, center, 6px); background: $blue-dark-300; color: $white; font-weight: 600; padding: 7px 14px; border-radius: 999px; font-size: 13px; }
.chip-plain { @include flex(center, center, 6px); background: $blue-light; color: $blue-dark-300; padding: 7px 14px; border-radius: 999px; font-size: 13px; }
.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }
</style>
