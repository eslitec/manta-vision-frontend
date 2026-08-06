<template lang="pug">
.brand(v-if="profile")
  header.brand__head
    h1.brand__h1 品牌資訊維護
    p.brand__sub 維護此機器人的品牌描述與詞文素材。
    p.brand__note
      i.ti.ti-info-circle
      span 品牌設定目前僅套用於「AI 產生行銷 PO 文」；圖生圖、圖生影、AI 試穿不會帶入品牌。

  section.card
    h3.card__title 品牌基本資料
    .field
      label 品牌名稱
      input(type="text" v-model="profile.name")
    .field
      label 一句話定位
      input(type="text" v-model="profile.positioning" placeholder="嚴選日常打扮與居品，讓生活有溫度")
    .field
      label 官方網站
      input(type="text" v-model="profile.website" placeholder="https://…")
    .field
      label 產業別
      input(type="text" v-model="profile.industry")

  section.card
    h3.card__title 品牌視覺識別
    .field
      label 品牌 Logo
      label.logo
        input.logo__input(type="file" accept="image/png,image/svg+xml,image/*" @change="onLogo")
        img.logo__preview(v-if="profile.logoUrl" :src="profile.logoUrl" alt="Logo")
        i.ti.ti-photo(v-else)
        span {{ profile.logoName || '上傳 Logo（PNG／SVG，標準去背）' }}
    .field
      label 品牌色票
      .swatches
        .swatch(v-for="(c, i) in profile.colors" :key="i")
          input.swatch__chip(type="color" v-model="c.hex")
          button.swatch__del(@click="removeColor(i)" aria-label="移除")
            i.ti.ti-x
          input.swatch__label(type="text" v-model="c.label")
          span.swatch__hex {{ c.hex.toUpperCase() }}
        button.swatch__add(@click="addColor")
          i.ti.ti-plus
          span 新增
      .suggest(v-if="analyzing || suggested.length")
        .suggest__head
          span.suggest__title(v-if="analyzing") 分析 Logo 顏色中…
          span.suggest__title(v-else) 從 Logo 抽取的顏色（點色塊加入色票）
          button.suggest__apply(v-if="suggested.length" @click="applyAllSuggested") 全部套用
        .suggest__chips(v-if="suggested.length")
          button.suggest__chip(
            v-for="c in suggested"
            :key="c"
            :style="{ background: c }"
            :title="c"
            @click="addSuggested(c)"
          )
            span.suggest__hex {{ c }}

  section.card
    h3.card__title 文案風格
    .field
      label 語氣風格（可複選）
      .chips
        button.chip(v-for="t in toneOptions" :key="t" :class="{ 'is-on': profile.tones.includes(t) }" @click="toggleTone(t)") {{ t }}
    .field
      label 常用 Hashtag
      .chips
        span.tag(v-for="(h, i) in profile.hashtags" :key="h")
          span {{ h }}
          button.tag__del(@click="removeHashtag(i)" aria-label="移除")
            i.ti.ti-x
        input.tagadd(
          v-if="addingTag"
          ref="tagInput"
          v-model="newTag"
          type="text"
          placeholder="輸入標籤，Enter 新增"
          @keyup.enter="confirmAddTag"
          @keyup.esc="cancelAddTag"
          @blur="confirmAddTag"
        )
        button.chip(v-else @click="startAddTag") ＋ 新增標籤
    .field
      label 稱呼客戶方式
      input.short(type="text" v-model="profile.addressing")
    .field
      label 避免使用的字詞／不希望提及
      textarea(v-model="profile.avoidWords" rows="2" placeholder="例：最便宜、瘋狂促銷字眼、缺乏品味…")

  .brand__foot
    span.brand__saved(v-if="saved") 已儲存
    PrimaryButton(:disabled="saving" @click="onSave") {{ saving ? '儲存中…' : '儲存設定' }}
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useBrandStore } from '@/stores/brand'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { extractColors } from '@/utils/colors'

const store = useBrandStore()
const { profile, saving } = storeToRefs(store)
const saved = ref(false)
const analyzing = ref(false)
const suggested = ref<string[]>([])

const toneOptions = ['溫暖親切', '文青質感', '專業可信', '活潑俏皮', '簡約網感']

onMounted(store.load)

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

async function onLogo(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f || !profile.value) return
  profile.value.logoName = f.name
  // mock：Logo 轉 data URL 存進 profile，會跟著「儲存設定」一起被記錄、也能預覽。
  // 後端就緒後改為上傳 blob 到 R2、把 logoUrl 換成 R2 網址。
  try {
    profile.value.logoUrl = await readAsDataURL(f)
  } catch {
    /* 讀取失敗就不設預覽 */
  }
  analyzing.value = true
  suggested.value = []
  try {
    suggested.value = await extractColors(f) // 前端分析 Logo 主導色
  } catch {
    suggested.value = []
  } finally {
    analyzing.value = false
  }
}
function addSuggested(hex: string) {
  if (!profile.value) return
  if (profile.value.colors.some((c) => c.hex.toUpperCase() === hex.toUpperCase())) return // 已有則略過
  profile.value.colors.push({ label: '品牌色', hex })
}
function applyAllSuggested() {
  suggested.value.forEach(addSuggested)
}
function toggleTone(t: string) {
  if (!profile.value) return
  const i = profile.value.tones.indexOf(t)
  if (i >= 0) profile.value.tones.splice(i, 1)
  else profile.value.tones.push(t)
}

// 常用 Hashtag：刪除與新增（行內輸入）
const addingTag = ref(false)
const newTag = ref('')
const tagInput = ref<HTMLInputElement | null>(null)

function removeHashtag(i: number) {
  profile.value?.hashtags.splice(i, 1)
}
async function startAddTag() {
  addingTag.value = true
  newTag.value = ''
  await nextTick()
  tagInput.value?.focus()
}
function confirmAddTag() {
  if (profile.value) {
    let t = newTag.value.trim()
    if (t) {
      if (!t.startsWith('#')) t = '#' + t // 沒帶井號自動補上
      if (!profile.value.hashtags.includes(t)) profile.value.hashtags.push(t)
    }
  }
  addingTag.value = false
}
function cancelAddTag() {
  addingTag.value = false
}
function addColor() {
  profile.value?.colors.push({ label: '新色', hex: '#888888' })
}
function removeColor(i: number) {
  profile.value?.colors.splice(i, 1)
}
async function onSave() {
  await store.save()
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}
</script>

<style scoped lang="scss">
.brand { max-width: 680px; }
.brand__head { margin-bottom: 20px; }
.brand__h1 { font-size: 24px; font-weight: 800; color: $blue-dark-300; }
.brand__sub { font-size: 14px; color: $gray-400; margin-top: 4px; }
.brand__note { @include flex(flex-start, center, 8px); margin-top: 12px; padding: 10px 14px; background: $blue-light; border-radius: 10px; font-size: 13px; color: $blue-dark-300;
  i { font-size: 16px; color: $blue; flex-shrink: 0; } }
.card { @include card; padding: 22px 24px; margin-bottom: 16px; }
.card__title { font-size: 16px; font-weight: 700; color: $blue-dark-300; margin-bottom: 16px; }
.field { margin-bottom: 16px; &:last-child { margin-bottom: 0; }
  label { display: block; font-size: 13px; color: $gray-400; margin-bottom: 6px; }
  input:not([type='color']):not([type='file']):not(.tagadd), textarea { width: 100%; border: 1px solid $gray; border-radius: 10px; padding: 10px 14px; font-size: 14px; font-family: inherit; color: $blue-dark-300; outline: none; resize: vertical;
    &:focus { border-color: $blue; } &::placeholder { color: $gray-100; } }
  input.short { max-width: 160px; } }
.logo { display: flex; align-items: center; gap: 12px; border: 1.5px dashed $gray; border-radius: 10px; padding: 16px; color: $gray-100; font-size: 20px; background: $blue-light; cursor: pointer;
  &:hover { border-color: $blue; }
  &__input { display: none; }
  &__preview { width: 40px; height: 40px; border-radius: 8px; object-fit: contain; background: $white; border: 1px solid $gray; flex-shrink: 0; }
  span { font-size: 13px; color: $gray-400; } }
.suggest { margin-top: 16px; padding: 14px; border: 1px dashed $babyBlue; border-radius: 10px; background: $blue-light;
  &__head { @include flex(space-between, center); margin-bottom: 10px; }
  &__title { font-size: 13px; color: $gray-400; }
  &__apply { font-size: 13px; font-weight: 600; color: $blue; }
  &__chips { @include flex(flex-start, center, 10px); flex-wrap: wrap; }
  &__chip { @include flex(flex-end, center); width: 72px; height: 48px; border-radius: 8px; border: 1px solid rgba(23,30,82,.12); cursor: pointer; overflow: hidden;
    &:hover { transform: translateY(-1px); } }
  &__hex { width: 100%; text-align: center; font-size: 10px; font-weight: 600; color: $white; background: rgba(23,30,82,.4); padding: 2px 0; } }
.swatches { @include flex(flex-start, flex-start, 16px); flex-wrap: wrap; }
.swatch { position: relative; @include flex(flex-start, center, 6px); flex-direction: column; width: 64px;
  &__chip { width: 56px; height: 44px; border-radius: 8px; border: 1px solid $gray; padding: 0; cursor: pointer;
    &::-webkit-color-swatch-wrapper { padding: 0; }
    &::-webkit-color-swatch { border: none; border-radius: 7px; }
    &::-moz-color-swatch { border: none; border-radius: 7px; } }
  &__del { position: absolute; top: -7px; right: 2px; width: 20px; height: 20px; border-radius: 50%; background: $red; color: $white; @include flex(center, center); opacity: 0; transition: opacity .12s; box-shadow: $boxShadow; z-index: 2;
    i { font-size: 13px; line-height: 1; } }
  &:hover &__del { opacity: 1; }
  &__label { width: 100%; text-align: center; font-size: 12px; color: $blue-dark-300; border: none; padding: 0; outline: none; background: none;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; &:focus { color: $blue; } }
  &__hex { font-size: 11px; color: $gray-100; white-space: nowrap; }
  &__add { @include flex(center, center, 4px); flex-direction: column; width: 56px; height: 44px; border: 1px dashed $gray; border-radius: 8px; color: $gray-100; font-size: 16px;
    span { font-size: 12px; } } }
.chips { @include flex(flex-start, center, 8px); flex-wrap: wrap; }
.chip { padding: 6px 14px; border-radius: 999px; font-size: 13px; color: $gray-400; border: 1px solid $gray; background: $white;
  &.is-on { background: $blue-dark-300; color: $white; border-color: $blue-dark-300; } }
.tag { @include flex(center, center, 6px); padding: 6px 8px 6px 12px; border-radius: 999px; font-size: 13px; background: $tagOrange; color: #99521e;
  &__del { @include flex(center, center); width: 16px; height: 16px; border-radius: 50%; color: #99521e; opacity: .55; flex-shrink: 0;
    i { font-size: 12px; line-height: 1; }
    &:hover { opacity: 1; background: rgba(153, 82, 30, .16); } } }
.tagadd { height: 32px; border: 1px solid $blue; border-radius: 999px; padding: 0 14px; font-size: 13px; font-family: inherit; color: $blue-dark-300; outline: none; }
.brand__foot { @include flex(flex-end, center, 12px); margin-top: 20px; }
.brand__saved { font-size: 13px; color: $green; }
</style>
