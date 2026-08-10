<template lang="pug">
.library
  p.library__note
    span.library__note-dot
    span {{ noteText }}
  .tabs
    button.tabs__item(v-for="t in tabs" :key="t" :class="{ 'is-active': activeTab === t }" @click="activeTab = t") {{ t }}
  .library__body
    aside.folders
      button.folders__item(:class="{ 'is-active': activeView.kind === 'all' }" @click="setView({ kind: 'all' })")
        span 全部素材
        span.folders__count {{ assets.length }}
      .folders__section 系統分類
      button.folders__item(v-for="c in categoryTags" :key="c.tag" :class="{ 'is-active': activeView.kind === 'category' && activeView.tag === c.tag }" @click="setView({ kind: 'category', tag: c.tag })")
        span {{ c.label }}
        span.folders__count {{ categoryCounts.get(c.tag) ?? 0 }}
      .folders__section.folders__section--folders
        span 我的資料夾
        button.folders__add-icon(@click="startAddFolder" aria-label="新增資料夾") +
      button.folders__item.folders__item--folder(v-for="f in folders" :key="f" :class="{ 'is-active': activeView.kind === 'folder' && activeView.name === f }" @click="setView({ kind: 'folder', name: f })")
        i.ti.ti-folder.folders__item-icon
        span.folders__item-name {{ f }}
        span.folders__count {{ folderCounts.get(f) ?? 0 }}
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
      p.folders__hint 可將素材拖曳至資料夾，或用批次選擇移動
    section.assets
      .assets__toolbar
        .search
          i.ti.ti-search.search__icon
          input.search__input(v-model="keyword" type="text" placeholder="搜尋素材名稱或標籤")
        .sources
          span.sources__label 來源
          button.chip(v-for="s in sources" :key="s.label" :class="{ 'is-active': activeSource === s.value }" @click="activeSource = s.value") {{ s.label }}
        .assets__actions
          DialogButton(variant="primary" v-if="activeView.kind === 'folder'" @click="pickerOpen = true")
            i.ti.ti-library-photo
            span 從圖庫加入
          label.upload
            i.ti.ti-upload
            span 上傳圖片
            input.upload__input(type="file" accept="image/*" multiple @change="onUpload")

      .batchbar(v-if="selectedIds.size")
        .batchbar__left
          span.batchbar__minus
          span 已選 {{ selectedIds.size }} 筆
          button.batchbar__link(@click="selectAllOnPage") 全選本頁 {{ paged.length }} 筆
          button.batchbar__link(@click="clearSelection") 清除
        .batchbar__right
          button.batchbar__action(@click="openMoveDialog") 移至資料夾
          button.batchbar__action(v-if="activeView.kind === 'folder'" @click="removeSelectedFromFolder") 移出資料夾
          button.batchbar__action(@click="downloadSelected") 下載
          OutlineButton(variant="danger" @click="openDeleteDialog")
            i.ti.ti-trash
            | 刪除

      .assets__empty(v-if="!filtered.length && !pendingTasks.length") 沒有符合的素材
      .assets__grid(v-else)
        .asset.asset--pending(v-for="t in pendingTasks" :key="t.id")
          .pending
            span.pending__play
              svg(viewBox="0 0 24 24" width="13" height="13")
                path(d="M8 5v14l11-7z" fill="white")
            span.pending__pct {{ t.status === 'queued' ? '排隊中…' : '生成中 ' + t.progress + '%' }}
            .pending__bar
              .pending__bar-fill(:style="{ width: t.progress + '%' }")
            span.pending__eta(v-if="t.status !== 'queued'") {{ etaText(t.progress) }}
          .asset__name {{ t.name }}
          .asset__pmeta 影片 · {{ t.videoReq?.ratio || '9:16' }} · 完成後自動入庫
        .asset(v-for="a in paged" :key="a.id" :class="{ 'is-selected': selectedIds.has(a.id) }")
          label.asset__check
            input(type="checkbox" :checked="selectedIds.has(a.id)" @change="toggleSelect(a.id)")
            span.asset__check-box
              i.ti.ti-check(v-if="selectedIds.has(a.id)")
          .asset__thumb
            i.ti(:class="a.type === 'video' ? 'ti-player-play' : 'ti-photo'")
          .asset__name {{ a.name }}
          .asset__meta
            span.tag(:class="'tag--' + a.tag") {{ a.source }}
            span.asset__dim {{ a.dim }}

      .pagination(v-if="filtered.length")
        span.pagination__total 共 {{ filtered.length }} 筆素材
        .pagination__pages
          button.pagination__nav(:disabled="page === 1" @click="page = page - 1") ‹
          template(v-for="(p, i) in pageItems" :key="i")
            span.pagination__ellipsis(v-if="p === '…'") …
            button.pagination__page(v-else :class="{ 'is-active': p === page }" :disabled="p === page" @click="page = p") {{ p }}
          button.pagination__nav(:disabled="page === totalPages" @click="page = page + 1") ›

  ImagePickerDialog(
    v-model:open="pickerOpen"
    :multiple="true"
    :title="`從圖庫加入到「${activeFolderName}」`"
    @select-many="onAddFromLibrary"
  )

  Teleport(to="body")
    .modal(v-if="moveDialogOpen" @click.self="moveDialogOpen = false")
      .modal__box
        header.modal__head
          h3.modal__title 移至資料夾
          button.modal__close(@click="moveDialogOpen = false" aria-label="關閉")
            i.ti.ti-x
        p.modal__desc 將選取的 {{ selectedIds.size }} 筆素材加入資料夾。素材可同時屬於多個資料夾。
        ul.modal__list
          li.modal__list-item(v-for="f in folders" :key="f" :class="{ 'is-active': moveTargetFolder === f }" @click="moveTargetFolder = f")
            i.ti.ti-folder
            span.modal__list-name {{ f }}
            span.modal__list-count {{ folderCounts.get(f) ?? 0 }}
        .modal__create
          input.modal__create-input(v-model="moveNewFolderName" type="text" placeholder="或建立新資料夾…" @keyup.enter="createFolderForMove")
          button.modal__create-btn(@click="createFolderForMove") 建立
        footer.modal__foot
          DialogButton(@click="moveDialogOpen = false") 取消
          DialogButton(variant="primary" :disabled="!moveTargetFolder" @click="confirmMoveToFolder") 移入{{ moveTargetFolder }}

  Teleport(to="body")
    .modal(v-if="deleteDialogOpen" @click.self="deleteDialogOpen = false")
      .modal__box
        header.modal__head
          h3.modal__title 刪除 {{ selectedIds.size }} 筆素材？
          button.modal__close(@click="deleteDialogOpen = false" aria-label="關閉")
            i.ti.ti-x
        .modal__preview
          .modal__preview-item(v-for="a in selectedAssets" :key="a.id")
            .modal__preview-thumb
              i.ti(:class="a.type === 'video' ? 'ti-player-play' : 'ti-photo'")
            span.modal__preview-name {{ a.name }}
        .modal__warn(v-if="referencedCount > 0")
          IconAlertTriangleFilled.modal__warn-icon
          .modal__warn-text
            strong 其中 {{ referencedCount }} 筆已被生成結果引用
            span 刪除後，引用它們的生成紀錄將無法回溯原始素材。此操作無法復原。
        label.modal__checkline
          input(type="checkbox" v-model="deleteConfirmed")
          span 我了解此操作無法復原
        footer.modal__foot
          button.modal__textbtn(@click="deleteDialogOpen = false") 取消
          button.modal__textbtn.modal__textbtn--danger(:disabled="!deleteConfirmed" @click="confirmDelete") 永久刪除 {{ selectedIds.size }} 筆
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAssets } from '@/composables/useAssets'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import OutlineButton from '@/components/OutlineButton.vue'
import DialogButton from '@/components/DialogButton.vue'
import IconAlertTriangleFilled from '@/components/icons/IconAlertTriangleFilled.vue'
import { CATEGORY_TAGS, type Asset, type AssetTag } from '@/types/asset'

const { assets, folders, load, loadFolders, addFolder, addToFolder, removeFromFolder, deleteAssets, upload } =
  useAssets()

// 非同步生成中的項目（目前只有圖生影會用到；圖片生成是同步完成，不會有機會停在「生成中」狀態）
// 跟頂部工具列「任務」徽章共用同一份 generationTasks store，只在「全部素材」第一頁顯示，
// 因為這些任務還沒有真正的資料夾／分類歸屬，不該出現在特定資料夾或系統分類的篩選結果裡
const { tasks: generationTasks } = storeToRefs(useGenerationTasksStore())
const pendingTasks = computed(() =>
  activeView.value.kind === 'all' && page.value === 1
    ? generationTasks.value.filter((t) => t.kind === 'video' && (t.status === 'queued' || t.status === 'processing'))
    : [],
)

const categoryTags = CATEGORY_TAGS

// 生成中卡片的剩餘時間：後端未提供 eta，依進度以約 2 分鐘估算（僅顯示用）
function etaText(progress: number) {
  const remain = Math.max(5, Math.round(((100 - progress) / 100) * 120))
  const m = Math.floor(remain / 60)
  const s = remain % 60
  return m > 0 ? `約剩 ${m} 分 ${s} 秒` : `約剩 ${s} 秒`
}

// 左側主要篩選：全部素材／系統分類（依 tag）／我的資料夾（使用者自訂），三者互斥、單選
type ActiveView = { kind: 'all' } | { kind: 'category'; tag: AssetTag } | { kind: 'folder'; name: string }
const activeView = ref<ActiveView>({ kind: 'all' })
function setView(v: ActiveView) {
  activeView.value = v
}
const activeFolderName = computed(() => (activeView.value.kind === 'folder' ? activeView.value.name : ''))

const tabs = ['素材庫', '編輯圖片', 'AI 修圖']
const activeTab = ref('素材庫')
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

// 頂部提示文字：檢視「全部素材」／系統分類時顯示機器人情境；檢視某個資料夾時改顯示該資料夾的說明
const noteText = computed(() => {
  if (activeView.value.kind === 'folder') {
    const count = folderCounts.value.get(activeView.value.name) ?? 0
    return `資料夾「${activeView.value.name}」・${count} 筆素材。移出後素材仍保留在圖庫，只是不再屬於此資料夾。`
  }
  return '此圖庫隸屬於機器人「日安選物」。切換機器人會顯示該機器人專屬的素材與生成產物。'
})

// 系統分類／我的資料夾的數量，都是從目前已載入的 assets 即時算出，不是後端另外提供的欄位
const categoryCounts = computed(() => {
  const map = new Map<AssetTag, number>()
  for (const c of categoryTags) map.set(c.tag, assets.value.filter((a) => a.tag === c.tag).length)
  return map
})
const folderCounts = computed(() => {
  const map = new Map<string, number>()
  for (const f of folders.value) map.set(f, assets.value.filter((a) => a.folders?.includes(f)).length)
  return map
})

// 資料夾／系統分類（左）與來源（右上）、關鍵字是不同維度，可疊加過濾
const filtered = computed(() =>
  assets.value.filter((a) => {
    const v = activeView.value
    const byView =
      v.kind === 'all' ? true : v.kind === 'category' ? a.tag === v.tag : (a.folders?.includes(v.name) ?? false)
    const bySource = activeSource.value === 'all' || a.tag === activeSource.value
    const byKeyword = !keyword.value || a.name.includes(keyword.value)
    return byView && bySource && byKeyword
  }),
)

// 分頁（純前端切頁，8 筆一頁）
const page = ref(1)
const pageSize = 8
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch([activeView, activeSource, keyword], () => {
  page.value = 1
})
// 篩選條件跟著切換時，先前的批次選取多半已經不對應目前畫面上看到的素材，直接清空避免誤操作
watch([activeView, activeSource, keyword], () => {
  clearSelection()
})

// 分頁按鈕清單（帶省略號），例如總頁數 16、目前第 1 頁 → [1, 2, 3, '…', 16]
const pageItems = computed<(number | '…')[]>(() => {
  const total = totalPages.value
  const cur = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const keep = new Set<number>([1, 2, 3, total, cur - 1, cur, cur + 1])
  const nums = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const items: (number | '…')[] = []
  let prev = 0
  for (const n of nums) {
    if (prev && n - prev > 1) items.push('…')
    items.push(n)
    prev = n
  }
  return items
})

// 批次選取（可跨頁累積，切換篩選條件時清空，見上方 watch）
const selectedIds = ref<Set<string>>(new Set())
function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}
function selectAllOnPage() {
  const next = new Set(selectedIds.value)
  for (const a of paged.value) next.add(a.id)
  selectedIds.value = next
}
function clearSelection() {
  selectedIds.value = new Set()
}

// 移至資料夾：完整彈窗（單選目標資料夾，可就地建立新資料夾）
const moveDialogOpen = ref(false)
const moveTargetFolder = ref('')
const moveNewFolderName = ref('')
function openMoveDialog() {
  moveTargetFolder.value = folders.value[0] ?? ''
  moveNewFolderName.value = ''
  moveDialogOpen.value = true
}
async function createFolderForMove() {
  const name = moveNewFolderName.value.trim()
  if (!name) return
  if (!folders.value.includes(name)) await addFolder(name)
  moveTargetFolder.value = name
  moveNewFolderName.value = ''
}
async function confirmMoveToFolder() {
  if (!moveTargetFolder.value) return
  await addToFolder([...selectedIds.value], moveTargetFolder.value)
  moveDialogOpen.value = false
  clearSelection()
}

async function removeSelectedFromFolder() {
  if (activeView.value.kind !== 'folder') return
  await removeFromFolder([...selectedIds.value], activeView.value.name)
  clearSelection()
}

// 刪除確認：完整彈窗（縮圖預覽＋勾選「我了解此操作無法復原」才能刪除）
const deleteDialogOpen = ref(false)
const deleteConfirmed = ref(false)
const selectedAssets = computed(() => assets.value.filter((a) => selectedIds.value.has(a.id)))
// 被生成結果引用（作為來源／參考圖）的選取素材數；刪除會斷開這些生成紀錄的來源鏈
const referencedCount = computed(() => selectedAssets.value.filter((a) => (a.referencedBy ?? 0) > 0).length)
function openDeleteDialog() {
  deleteConfirmed.value = false
  deleteDialogOpen.value = true
}
async function confirmDelete() {
  await deleteAssets([...selectedIds.value])
  deleteDialogOpen.value = false
  clearSelection()
}

function downloadSelected() {
  // 目前素材沒有實際檔案 URL，先做畫面呈現；等後端提供真實檔案來源後再接上真正的下載行為
}

// 從圖庫（遠端資料庫）挑既有素材加入目前資料夾
const pickerOpen = ref(false)
async function onAddFromLibrary(picked: Asset[]) {
  if (activeView.value.kind !== 'folder') return
  await addToFolder(
    picked.map((a) => a.id),
    activeView.value.name,
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
    setView({ kind: 'folder', name }) // 建好即切到新資料夾
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
  // 上傳落到目前所在資料夾（不在特定資料夾時進「未分類」）；傳整個 File，後端就緒後改上傳 blob 到 R2
  const target = activeView.value.kind === 'folder' ? activeView.value.name : undefined
  for (const f of Array.from(files)) {
    await upload(f, target)
  }
  input.value = '' // 清空，讓同一檔案再次選取也能觸發 change
}
</script>

<style scoped lang="scss">
.library {
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  &__note {
    @include flex(flex-start, center, 8px);
    color: $gray-400;
    font-size: 14px;
    margin-bottom: 8px;
  }
  &__note-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $blue;
    flex-shrink: 0;
  }
  &__body {
    display: flex;
    align-items: stretch; // 左右面板等高
    gap: 16px;
    flex: 1; // 撐滿剩餘高度，白色面板接近底部
    min-height: 0;
    @include below($bp-lg) {
      flex-direction: column;
    }
  }
}
.tabs {
  @include flex(flex-start, center, 8px);
  margin-bottom: 10px;
}
.tabs__item {
  @include flex(center, center);
  height: 22px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 14px;
  color: #606692;
  background: $white;
  border: 1px solid $gray;
  &.is-active {
    background: $blue-dark-500;
    color: $white;
    border-color: $blue-dark-500;
  }
}
.folders {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  @include below($bp-lg) {
    width: 100%;
  }
  background: $white;
  border-radius: 10px;
  box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2);
  padding: 16px;
  &__section {
    @include flex(space-between, center);
    font-size: 12px;
    color: $gray-100;
    margin: 14px 0 6px;
    padding: 0 12px;
  }
  &__add-icon {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    color: $blue-dark-500;
    font-size: 14px;
    line-height: 1;
    &:hover {
      background: $blue-light;
      color: $blue-dark-500;
    }
  }
  &__item {
    @include flex(flex-start, center, 8px);
    text-align: left;
    height: 36px;
    padding: 0 10px;
    border-radius: 8px;
    font-size: 14px;
    color: $dark-blue-gray;
    &:hover {
      background: $blue-light;
    }
    &.is-active {
      background: #eef1f7;
      color: $blue-dark-500;
      font-weight: 500;
      border: 1.5px dashed $blue-dark-500;
      padding: 0 8.5px;
    }
    > span:first-child,
    &--folder &-name {
      flex: 1;
    }
  }
  &__item-icon {
    color: $gray-100;
    font-size: 14px;
    flex-shrink: 0;
  }
  &__item-name {
    flex: 1;
  }
  &__count {
    color: $gray-100;
    font-size: 12px;
  }
  &.is-active &__count,
  &__item.is-active &__count {
    color: $blue-dark-500;
  }
  &__new {
    margin-top: 4px;
    padding: 0 12px;
  }
  &__input {
    width: 100%;
    height: 36px;
    border: 1px solid $blue;
    border-radius: 8px;
    padding: 0 10px;
    font-size: 14px;
    color: $blue-dark-500;
    outline: none;
  }
  &__hint {
    color: $gray-100;
    font-size: 11px;
    line-height: 1.5;
    margin-top: 12px;
    padding: 0 12px;
  }
}
.assets {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: $white;
  border-radius: 10px;
  box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2);
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
}
.assets__toolbar {
  @include flex(flex-start, center, 12px);
  margin-bottom: 16px;
  @include below($bp-md) {
    flex-wrap: wrap;
    .search {
      flex: 1 0 100%;
      max-width: none;
    }
    .assets__actions {
      flex: 1 0 100%;
    }
    .assets__actions > * {
      flex: 1;
    }
    .upload {
      width: 100%;
    }
  }
}
.assets__actions {
  @include flex(flex-start, center, 12px);
  margin-left: auto;
}
.search {
  position: relative;
  flex: 0 1 280px;
  max-width: 280px;
  &__icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: $gray-100;
    font-size: 16px;
  }
  &__input {
    width: 100%;
    height: 32px;
    border: 1px solid $gray;
    border-radius: 18px;
    padding: 0 14px 0 34px;
    font-size: 14px;
    color: $blue-dark-500;
    outline: none;
    &:focus {
      border-color: $blue;
    }
  }
}
.sources {
  @include flex(flex-start, center, 8px);
  flex-shrink: 0;
  &__label {
    font-size: 14px;
    color: #606692;
    margin-right: 2px;
    white-space: nowrap;
  }
}
.chip {
  padding: 3px 12px;
  border-radius: 16px;
  font-size: 13px;
  color: #606692;
  border: 1px solid $gray;
  background: $white;
  white-space: nowrap;
  flex-shrink: 0;
  &.is-active {
    background: $blue-dark-500;
    color: $white;
    border-color: $blue-dark-500;
  }
}
.upload {
  @include flex(center, center, 6px);
  background: $blue-dark-500;
  color: $white;
  font-weight: 500;
  padding: 9px 14px;
  border-radius: 16px;
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;
  &__input {
    display: none;
  }
}

.batchbar {
  @include flex(space-between, center);
  background: $blue-dark-500;
  color: $white;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 14px;
  &__left {
    @include flex(flex-start, center, 14px);
  }
  &__minus {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba($white, 0.2);
    flex-shrink: 0;
    position: relative;
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 1.5px;
      background: $white;
      transform: translate(-50%, -50%);
    }
  }
  &__link {
    color: rgba($white, 0.85);
    font-size: 14px;
    text-decoration: underline;
    &:hover {
      color: $white;
    }
  }
  &__right {
    @include flex(flex-start, center, 20px);
  }
  &__action {
    font-size: 14px;
    color: $white;
    &:hover {
      color: rgba($white, 0.8);
    }
  }
}

.assets__empty {
  flex: 1;
  color: $gray-100;
  font-size: 14px;
  padding: 40px 0;
  text-align: center;
}
.assets__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 244px));
  gap: 8px 16px;
  flex: 1; // 佔滿面板剩餘高度，讓分頁列貼齊底部
  align-content: flex-start; // 素材列靠上排列，不因多餘空間被拉開
  overflow-y: auto;
}
.asset {
  position: relative;
  &.is-selected .asset__thumb {
    outline: 2px solid $blue-dark-500;
    outline-offset: 2px;
  }
  &__check {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1;
    cursor: pointer;
    input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
  }
  &__check-box {
    @include flex(center, center);
    width: 18px;
    height: 18px;
    border-radius: 4px;
    background: $white;
    border: 1px solid $gray;
    font-size: 11px;
    color: $white;
  }
  &.is-selected &__check-box {
    background: $blue-dark-500;
    border-color: $blue-dark-500;
  }
  &__thumb {
    @include flex(center, center);
    aspect-ratio: 244 / 152;
    background: #eef1f7;
    border-radius: 8px;
    color: $babyBlue;
    font-size: 40px;
    margin-bottom: 8px;
  }
  &__name {
    font-size: 14px;
    font-weight: 500;
    color: $dark-blue-gray;
    margin-bottom: 2px;
  }
  &__meta {
    @include flex(flex-start, center, 8px);
  }
  &__dim {
    font-size: 12px;
    color: $gray-100;
  }
}
// ── 生成中（背景任務）卡片：對齊設計稿 ──
.pending {
  @include flex(center, center, 12px);
  flex-direction: column;
  aspect-ratio: 244 / 152;
  padding: 0 40px;
  background: $blue-light; // 灰底 #eff2fa
  border-radius: 8px;
  margin-bottom: 8px;
  &__play {
    @include flex(center, center);
    width: 30px;
    height: 22px;
    border-radius: 4px;
    background: $babyBlue; // #a5c8e6
    svg {
      display: block;
    }
  }
  &__pct {
    font-size: 14px;
    font-weight: 500;
    color: $blue-dark-500; // #2e3567
  }
  &__bar {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #dfe4f0; // 進度條軌道（灰底上的淺色）
    overflow: hidden;
  }
  &__bar-fill {
    height: 100%;
    border-radius: 3px;
    background: $blue-dark-500; // 深藍填色
    transition: width 0.3s;
  }
  &__eta {
    font-size: 13px;
    color: #606692;
  }
}
.asset__pmeta {
  font-size: 13px;
  color: $gray-100; // #b4b9c4
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.tag {
  font-size: 13px;
  padding: 2px 12px;
  border-radius: 16px;
  background: $white;
  border: 1px solid $gray;
  color: #606692;
  white-space: nowrap;
  // AI 生成來源標籤：暖黃底、無邊框（對齊設計稿）
  &--ai {
    background: #f6eac1;
    border-color: transparent;
    color: $dark-blue-gray;
  }
}

.pagination {
  @include flex(space-between, center);
  margin-top: 12px;
  &__total {
    font-size: 14px;
    color: #606692;
  }
  &__pages {
    @include flex(flex-start, center, 4px);
  }
  &__nav,
  &__page {
    min-width: 28px;
    height: 28px;
    padding: 0 6px;
    border-radius: 6px;
    font-size: 13px;
    color: #606692;
    &:hover:not(:disabled) {
      background: $blue-light;
    }
    &:disabled {
      color: $gray;
      cursor: not-allowed;
    }
    // 當前頁：無藍底、同色加粗、不可點（對齊設計稿）
    &.is-active {
      color: #606692;
      font-weight: 700;
      cursor: default;
      background: none;
    }
  }
  &__ellipsis {
    color: $gray-100;
    font-size: 13px;
    padding: 0 4px;
  }
}

.modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(23, 30, 82, 0.45);
  @include flex(center, center);
  padding: 24px;
}
.modal__box {
  width: 440px;
  max-width: 100%;
  max-height: 88vh;
  background: $white;
  border-radius: 16px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.modal__head {
  @include flex(space-between, center);
  margin-bottom: 8px;
}
.modal__title {
  font-size: 18px;
  font-weight: 700;
  color: $blue-dark-300;
}
.modal__close {
  color: $gray-400;
  font-size: 20px;
}
.modal__desc {
  font-size: 13px;
  color: $gray-400;
  margin-bottom: 14px;
}
.modal__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow-y: auto;
  margin-bottom: 10px;
}
.modal__list-item {
  @include flex(flex-start, center, 8px);
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: $blue-dark-300;
  cursor: pointer;
  &:hover {
    background: $blue-light;
  }
  &.is-active {
    background: $blue-light;
    font-weight: 700;
  }
}
.modal__list-name {
  flex: 1;
  text-align: left;
}
.modal__list-count {
  color: $gray-100;
  font-size: 12px;
}
.modal__create {
  @include flex(flex-start, center, 8px);
  margin-bottom: 18px;
}
.modal__create-input {
  flex: 1;
  height: 40px;
  border: 1px solid $gray;
  border-radius: 999px;
  padding: 0 16px;
  font-size: 14px;
  color: $blue-dark-300;
  outline: none;
  &:focus {
    border-color: $blue;
  }
}
.modal__create-btn {
  height: 40px;
  padding: 0 18px;
  border: 1px solid $gray;
  border-radius: 999px;
  font-size: 14px;
  color: $blue-dark-300;
  white-space: nowrap;
}
.modal__foot {
  @include flex(flex-end, center, 10px);
}
.modal__preview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.modal__preview-thumb {
  @include flex(center, center);
  aspect-ratio: 4 / 3;
  background: $blue-light;
  border-radius: 8px;
  color: $babyBlue;
  font-size: 22px;
  margin-bottom: 6px;
}
.modal__preview-name {
  display: block;
  font-size: 12px;
  color: $blue-dark-300;
}
.modal__checkline {
  @include flex(flex-start, center, 8px);
  font-size: 14px;
  color: $blue-dark-300;
  margin-bottom: 18px;
  cursor: pointer;
}
.modal__warn {
  @include flex(flex-start, center, 10px); // 圖示上下置中（對齊設計稿）
  background: $blue-light;
  border-left: 3px solid #ff6148; // 左側橘紅長條
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.modal__warn-icon {
  width: 20px;
  height: 20px;
  color: #ff6148; // 實心三角填色
  flex-shrink: 0;
}
.modal__warn-text {
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
    line-height: 1.5;
  }
}
.modal__textbtn {
  font-size: 14px;
  font-weight: 600;
  color: $blue-dark-500;
  padding: 8px 12px;
  &--danger {
    color: $red;
    &:disabled {
      color: rgba($red, 0.4);
      cursor: not-allowed;
    }
  }
}
</style>
