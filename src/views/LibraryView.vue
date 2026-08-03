<template lang="pug">
.library
  p.library__note
    span.library__note-dot
    span 此圖庫隸屬於機器人「日安選物」。切換機器人會顯示該機器人專屬的素材與生成產物。
  .tabs
    button.tabs__item(v-for="t in tabs" :key="t" :class="{ 'is-active': activeTab === t }" @click="activeTab = t") {{ t }}
  .library__body
    aside.folders
      .folders__title 資料夾
      button.folders__item(:class="{ 'is-active': activeFolder === ALL }" @click="activeFolder = ALL") 全部素材
      button.folders__item(v-for="f in folders" :key="f" :class="{ 'is-active': activeFolder === f }" @click="activeFolder = f") {{ f }}
      .folders__new(v-if="addingFolder")
        input.folders__input(
          ref="folderInput"
          v-model="newFolderName"
          type="text"
          placeholder="資料夾名稱"
          @keyup.enter="confirmAddFolder"
          @keyup.esc="cancelAddFolder"
          @blur="confirmAddFolder"
        )
      button.folders__add(v-else @click="startAddFolder")
        span +
        span 新增資料夾
    section.assets
      .assets__toolbar
        .search
          i.ti.ti-search.search__icon
          input.search__input(v-model="keyword" type="text" placeholder="搜尋素材名稱或標籤")
        .sources
          span.sources__label 來源
          button.chip(v-for="s in sources" :key="s.label" :class="{ 'is-active': activeSource === s.value }" @click="activeSource = s.value") {{ s.label }}
        .assets__actions
          button.fromlib(v-if="activeFolder !== ALL" @click="pickerOpen = true")
            i.ti.ti-library-photo
            span 從圖庫加入
          label.upload
            i.ti.ti-upload
            span 上傳圖片
            input.upload__input(type="file" accept="image/*" multiple @change="onUpload")
      .assets__empty(v-if="!filtered.length") 沒有符合的素材
      .assets__grid(v-else)
        .asset(v-for="a in filtered" :key="a.id")
          .asset__thumb
            i.ti(:class="a.type === 'video' ? 'ti-player-play' : 'ti-photo'")
          .asset__name {{ a.name }}
          .asset__meta
            span.tag(:class="'tag--' + a.tag") {{ a.source }}
            span.asset__dim {{ a.dim }}

  ImagePickerDialog(
    v-model:open="pickerOpen"
    :multiple="true"
    :title="`從圖庫加入到「${activeFolder}」`"
    @select-many="onAddFromLibrary"
  )
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useAssets } from '@/composables/useAssets'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import type { Asset } from '@/types/asset'

const { assets, folders, load, loadFolders, addFolder, addToFolder, upload } = useAssets()

const ALL = '全部素材' // 特殊項：不套用資料夾過濾

const tabs = ['素材庫', '編輯圖片', 'AI 修圖']
const activeTab = ref('素材庫')
const activeFolder = ref(ALL)
const sources = [
  { label: '全部', value: 'all' },
  { label: '上傳', value: 'upload' },
  { label: 'AI 生成', value: 'ai' },
  { label: '編輯產物', value: 'edit' },
]
const activeSource = ref('all')
const keyword = ref('')

onMounted(() => {
  load()
  loadFolders()
})

// 資料夾（左）與來源（右上）是獨立維度，可疊加過濾
const filtered = computed(() =>
  assets.value.filter((a) => {
    const byFolder = activeFolder.value === ALL || (a.folders?.includes(activeFolder.value) ?? false)
    const bySource = activeSource.value === 'all' || a.tag === activeSource.value
    const byKeyword = !keyword.value || a.name.includes(keyword.value)
    return byFolder && bySource && byKeyword
  }),
)

// 從圖庫（遠端資料庫）挑既有素材加入目前資料夾
const pickerOpen = ref(false)
async function onAddFromLibrary(picked: Asset[]) {
  if (activeFolder.value === ALL) return
  await addToFolder(
    picked.map((a) => a.id),
    activeFolder.value,
  )
}

// 新增資料夾（行內輸入）
const addingFolder = ref(false)
const newFolderName = ref('')
const folderInput = ref<HTMLInputElement | null>(null)

async function startAddFolder() {
  addingFolder.value = true
  newFolderName.value = ''
  await nextTick()
  folderInput.value?.focus()
}
async function confirmAddFolder() {
  const name = newFolderName.value.trim()
  if (name && !folders.value.includes(name)) {
    await addFolder(name)
    activeFolder.value = name // 建好即切到新資料夾
  }
  addingFolder.value = false
}
function cancelAddFolder() {
  addingFolder.value = false
}

async function onUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || !files.length) return
  // 上傳落到目前所在資料夾（在「全部素材」時進未分類）；傳整個 File，後端就緒後改上傳 blob 到 R2
  const target = activeFolder.value === ALL ? undefined : activeFolder.value
  for (const f of Array.from(files)) {
    await upload(f, target)
  }
  input.value = '' // 清空，讓同一檔案再次選取也能觸發 change
}
</script>

<style scoped lang="scss">
.library { &__note { @include flex(flex-start, center, 8px); color: $gray-400; font-size: 14px; margin-bottom: 16px; }
  &__note-dot { width: 6px; height: 6px; border-radius: 50%; background: $blue; flex-shrink: 0; }
  &__body { display: flex; gap: 20px; } }
.tabs { @include flex(flex-start, center, 8px); margin-bottom: 18px; }
.tabs__item { padding: 7px 16px; border-radius: 999px; font-size: 14px; color: $gray-400; background: $white; border: 1px solid $gray;
  &.is-active { background: $blue-dark-300; color: $white; border-color: $blue-dark-300; } }
.folders { width: 160px; flex-shrink: 0; display: flex; flex-direction: column; gap: 2px;
  &__title { font-size: 15px; font-weight: 700; color: $blue-dark-300; margin-bottom: 10px; }
  &__item { text-align: left; padding: 9px 12px; border-radius: 8px; font-size: 14px; color: $gray-400;
    &:hover { background: $blue-light; } &.is-active { background: $blue-light; color: $blue-dark-300; font-weight: 600; } }
  &__add { @include flex(flex-start, center, 6px); padding: 9px 12px; font-size: 14px; color: $blue; margin-top: 4px; }
  &__new { margin-top: 4px; }
  &__input { width: 100%; height: 36px; border: 1px solid $blue; border-radius: 8px; padding: 0 10px; font-size: 14px; color: $blue-dark-300; outline: none; } }
.assets { flex: 1; min-width: 0; }
.assets__toolbar { @include flex(flex-start, center, 12px); margin-bottom: 18px; }
.assets__actions { @include flex(flex-start, center, 12px); margin-left: auto; }
.search { position: relative; flex: 0 1 320px; max-width: 320px;
  &__icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: $gray-100; font-size: 16px; }
  &__input { width: 100%; height: 38px; border: 1px solid $gray; border-radius: 999px; padding: 0 14px 0 34px; font-size: 14px; color: $blue-dark-300; outline: none; &:focus { border-color: $blue; } } }
.sources { @include flex(flex-start, center, 8px); &__label { font-size: 13px; color: $gray-400; margin-right: 2px; } }
.chip { padding: 5px 12px; border-radius: 999px; font-size: 13px; color: $gray-400; border: 1px solid $gray; background: $white;
  &.is-active { background: $blue-dark-300; color: $white; border-color: $blue-dark-300; } }
.fromlib { @include flex(center, center, 6px); border: 1px solid $gray; color: $blue-dark-300; background: $white; font-weight: 600; padding: 9px 16px; border-radius: 999px; font-size: 14px; white-space: nowrap; cursor: pointer;
  &:hover { border-color: $blue; } }
.upload { @include flex(center, center, 6px); background: $blue-dark-300; color: $white; font-weight: 600; padding: 9px 16px; border-radius: 999px; font-size: 14px; white-space: nowrap; cursor: pointer;
  &__input { display: none; } }
.assets__empty { color: $gray-100; font-size: 14px; padding: 40px 0; text-align: center; }
.assets__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; }
.asset { &__thumb { @include flex(center, center); aspect-ratio: 4 / 3; background: $blue-light; border-radius: 10px; color: $babyBlue; font-size: 30px; margin-bottom: 8px; }
  &__name { font-size: 14px; color: $blue-dark-300; margin-bottom: 5px; }
  &__meta { @include flex(flex-start, center, 8px); } &__dim { font-size: 12px; color: $gray-100; } }
.tag { font-size: 12px; padding: 2px 8px; border-radius: 6px; font-weight: 500;
  &--upload { background: #E6F1FB; color: #185FA5; } &--object { background: #EEEDFE; color: #534AB7; }
  &--ai { background: #FAEEDA; color: #854F0B; } &--edit { background: #EAF3DE; color: #3B6D11; } &--video { background: #FBEAF0; color: #993556; } }
</style>
