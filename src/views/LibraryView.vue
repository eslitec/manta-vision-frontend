<template lang="pug">
.library
  h1.visuallyHidden {{ t('routeTitles.library') }}
  p.library__note(v-if="activeTab === 'library'")
    span.library__noteDot
    span {{ noteText }}
  .tabs(role="tablist" :aria-label="t('routeTitles.library')")
    button.tabs__item(v-for="item in tabs" :key="item.value" role="tab" :aria-selected="activeTab === item.value" :class="{ 'isActive': activeTab === item.value }" @click="activeTab = item.value") {{ item.label }}
  .library__body(v-if="activeTab === 'library'")
    button.mobileFolderToggle(
      type="button"
      :aria-expanded="foldersOpen"
      aria-controls="library-folders"
      @click="foldersOpen = !foldersOpen"
    )
      span.mobileFolderToggle__label {{ activeViewLabel }}
      span.mobileFolderToggle__count {{ activeViewCount }}
      IconChevronDown(:class="{ isUp: foldersOpen }")
    aside#library-folders.folders(:class="{ 'isMobileOpen': foldersOpen }")
      button.folders__item(:class="{ 'isActive': activeView.kind === 'all' }" @click="setView({ kind: 'all' })")
        span {{ t('library.allAssets') }}
        span.folders__count {{ assets.length }}
      .folders__section {{ t('library.systemCategories') }}
      button.folders__item(v-for="c in categoryTags" :key="c.tag" :class="{ 'isActive': activeView.kind === 'category' && activeView.tag === c.tag }" @click="setView({ kind: 'category', tag: c.tag })")
        span {{ t(`sources.${c.tag}`) }}
        span.folders__count {{ categoryCounts.get(c.tag) ?? 0 }}
      .folders__section.folders__section--folders
        span {{ t('library.myFolders') }}
        button.folders__addIcon(type="button" @click="startAddFolder" :aria-label="t('library.addFolder')")
          span(aria-hidden="true") ＋
      FolderRow(
        v-for="f in folders"
        :key="f"
        :name="f"
        :count="folderCounts.get(f) ?? 0"
        :active="activeView.kind === 'folder' && activeView.name === f"
        @click="setView({ kind: 'folder', name: f })"
      )
      .folders__new(v-if="addingFolder")
        input.folders__input(
          ref="folderInput"
          v-model="newFolderName"
          type="text"
          :aria-label="t('library.folderName')"
          :placeholder="t('library.folderName')"
          @keyup.enter="confirmAddFolder"
          @keyup.esc="cancelAddFolder"
          @blur="confirmAddFolder"
        )
      p.folders__hint {{ t('library.folderHint') }}
    section.assets
      .assets__toolbar
        AppSearchbar.assets__search(v-model="keyword" :label="t('imagePicker.searchPlaceholder')" :placeholder="t('imagePicker.searchPlaceholder')")
        .sources
          span.sources__label {{ t('library.source') }}
          button.chip(v-for="s in sources" :key="s.label" :aria-pressed="activeSource === s.value" :class="{ 'isActive': activeSource === s.value }" @click="activeSource = s.value") {{ s.label }}
        .assets__actions
          AppButton(variant="primary" icon @click="uploadInput?.click()")
            IconUpload
            span {{ t('library.uploadImages') }}
          input.upload__input(ref="uploadInput" type="file" accept="image/*" multiple @change="onUpload")

      .batchbar(v-if="selectedIds.size")
        .batchbar__selection
          span.batchbar__minus
          span {{ t('library.selectedCount', { count: selectedIds.size }) }}
          button.batchbar__link(@click="selectAllOnPage") {{ t('library.selectPage', { count: paged.length }) }}
          button.batchbar__link(@click="clearSelection") {{ t('common.clear') }}
        .batchbar__actions
          AppButton.batchbar__action.batchbar__action--moveToFolder(variant="primary" @click="openMoveDialog") {{ t('library.moveToFolder') }}
          AppButton.batchbar__action.batchbar__action--removeFromFolder(variant="outline" v-if="activeView.kind === 'folder'" @click="removeSelectedFromFolder") {{ t('library.removeFromFolder') }}
          AppButton.batchbar__action(variant="ghost" @click="downloadSelected") {{ t('common.download') }}
          AppButton(variant="alert" @click="openDeleteDialog")
            IconDelete
            | {{ t('common.delete') }}

      .assets__empty(v-if="!filtered.length && !pendingTasks.length") {{ t('library.empty') }}
      .assets__grid(v-else)
        .asset.asset--pending(v-for="t in pendingTasks" :key="t.id")
          .pending
            span.pending__play
              IconPlayTriangle
            span.pending__pct {{ t.status === 'pending' ? `${$t('taskCenter.pending')} ${t.progress}%` : $t('library.generatingProgress', { progress: t.progress }) }}
            .pending__bar
              .pending__barFill(:style="{ width: t.progress + '%' }")
            span.pending__eta(v-if="t.status !== 'pending'") {{ etaText(t.progress) }}
          .asset__name {{ t.name }}
          .asset__pmeta {{ $t('library.pendingVideoMeta', { ratio: t.videoReq?.ratio || '9:16' }) }}
        AssetCard(
          v-for="a in paged"
          :key="a.id"
          :name="a.name"
          :tag="a.tag"
          :tag-label="$t(`sources.${a.tag}`)"
          :dimensions="a.dim"
          :type="a.type"
          :selected="selectedIds.has(a.id)"
          @toggle="toggleSelect(a.id)"
        )

      .pagination(v-if="filtered.length")
        span.pagination__total {{ t('library.totalAssets', { count: filtered.length }) }}
        .pagination__pages
          button.pagination__nav(:aria-label="t('library.previousPage')" :disabled="page === 1" @click="page = page - 1") ‹
          template(v-for="(p, i) in pageItems" :key="i")
            span.pagination__ellipsis(v-if="p === '…'") …
            button.pagination__page(v-else :aria-current="p === page ? 'page' : undefined" :aria-label="t('library.pageNumber', { page: p })" :class="{ 'isActive': p === page }" :disabled="p === page" @click="page = p") {{ p }}
          button.pagination__nav(:aria-label="t('library.nextPage')" :disabled="page === totalPages" @click="page = page + 1") ›

  ImageEditorWorkspace(v-else :mode="activeTab")

  Teleport(to="body")
    .modal(v-if="moveDialogOpen" @click.self="moveDialogOpen = false")
      .modal__box(ref="moveDialogRef" role="dialog" aria-modal="true" aria-labelledby="move-dialog-title" tabindex="-1")
        header.modal__head
          h3#move-dialog-title.modal__title {{ t('library.moveToFolder') }}
          button.modal__close(data-dialog-initial-focus @click="moveDialogOpen = false" :aria-label="t('common.close')")
            IconClose
        p.modal__desc {{ t('library.moveDescription', { count: selectedIds.size }) }}
        ul.modal__list
          li(v-for="f in folders" :key="f")
            button.modal__listItem(type="button" :aria-pressed="moveTargetFolder === f" :class="{ 'isActive': moveTargetFolder === f }" @click="moveTargetFolder = f")
              IconFolder
              span.modal__listName {{ f }}
              span.modal__listCount {{ folderCounts.get(f) ?? 0 }}
        .modal__create
          input.modal__createInput(v-model="moveNewFolderName" type="text" :aria-label="t('library.createFolderPlaceholder')" :placeholder="t('library.createFolderPlaceholder')" @keyup.enter="createFolderForMove")
          AppButton.modal__createBtn(variant="ghost" size="compact" @click="createFolderForMove") {{ t('common.create') }}
        footer.modal__foot
          AppButton(variant="outline" @click="moveDialogOpen = false") {{ t('common.cancel') }}
          AppButton(variant="primary" :disabled="!moveTargetFolder" @click="confirmMoveToFolder") {{ t('library.moveInto', { folder: moveTargetFolder }) }}

  Teleport(to="body")
    .modal(v-if="deleteDialogOpen" @click.self="deleteDialogOpen = false")
      .modal__box(ref="deleteDialogRef" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" tabindex="-1")
        header.modal__head
          h3#delete-dialog-title.modal__title {{ t('library.deleteTitle', { count: selectedIds.size }) }}
          button.modal__close(data-dialog-initial-focus @click="deleteDialogOpen = false" :aria-label="t('common.close')")
            IconClose
        .modal__preview
          .modal__previewItem(v-for="a in selectedAssets" :key="a.id")
            .modal__previewThumb
              component(:is="a.type === 'video' ? IconMovie : IconImagePlaceholder")
            span.modal__previewName {{ a.name }}
        .modal__warn(v-if="referencedCount > 0")
          IconAlertTriangleFilled.modal__warnIcon
          .modal__warnText
            strong {{ t('library.referencedWarning', { count: referencedCount }) }}
            span {{ t('library.deleteWarning') }}
        AppCheckbox.modal__checkline(v-model="deleteConfirmed") {{ t('library.deleteConfirm') }}
        footer.modal__foot
          AppButton(variant="ghost" @click="deleteDialogOpen = false") {{ t('common.cancel') }}
          AppButton(variant="alert" :disabled="!deleteConfirmed" @click="confirmDelete") {{ t('library.deletePermanently', { count: selectedIds.size }) }}
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAssets } from '@/composables/useAssets'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import AppButton from '@/components/AppButton.vue'
import AppCheckbox from '@/components/AppCheckbox.vue'
import AppSearchbar from '@/components/AppSearchbar.vue'
import AssetCard from '@/components/AssetCard.vue'
import FolderRow from '@/components/FolderRow.vue'
import IconAlertTriangleFilled from '@/components/icons/IconAlertTriangleFilled.vue'
import IconChevronDown from '@/components/icons/IconChevronDown.vue'
import IconClose from '@/components/icons/IconClose.vue'
import IconDelete from '@/components/icons/IconDelete.vue'
import IconFolder from '@/components/icons/IconFolder.vue'
import IconImagePlaceholder from '@/components/icons/IconImagePlaceholder.vue'
import IconMovie from '@/components/icons/IconMovie.vue'
import IconPlayTriangle from '@/components/icons/IconPlayTriangle.vue'
import IconUpload from '@/components/icons/IconUpload.vue'
import ImageEditorWorkspace from '@/components/ImageEditorWorkspace.vue'
import { CATEGORY_TAGS, UNFILED_FOLDER, type Asset, type AssetTag } from '@/types/asset'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'

const { assets, folders, load, loadFolders, addFolder, moveToFolder, removeFromFolder, deleteAssets, upload } =
  useAssets()
const { t } = useI18n()
const moveDialogRef = ref<HTMLElement | null>(null)
const deleteDialogRef = ref<HTMLElement | null>(null)
const uploadInput = ref<HTMLInputElement | null>(null)

// 非同步生成中的項目（目前只有圖生影會用到；圖片生成是同步完成，不會有機會停在「生成中」狀態）
// 跟頂部工具列「任務」徽章共用同一份 generationTasks store，只在「全部素材」第一頁顯示，
// 因為這些任務還沒有真正的資料夾／分類歸屬，不該出現在特定資料夾或系統分類的篩選結果裡
const { tasks: generationTasks } = storeToRefs(useGenerationTasksStore())
const pendingTasks = computed(() =>
  activeView.value.kind === 'all' && page.value === 1
    ? generationTasks.value.filter((t) => t.kind === 'video' && (t.status === 'pending' || t.status === 'processing'))
    : [],
)

const categoryTags = CATEGORY_TAGS

// 生成中卡片的剩餘時間：後端未提供 eta，依進度以約 2 分鐘估算（僅顯示用）
function etaText(progress: number) {
  const remain = Math.max(5, Math.round(((100 - progress) / 100) * 120))
  const m = Math.floor(remain / 60)
  const s = remain % 60
  return m > 0
    ? t('common.remainingMinutesSeconds', { minutes: m, seconds: s })
    : t('common.remainingSeconds', { seconds: s })
}

// 左側主要篩選：全部素材／系統分類（依 tag）／我的資料夾（使用者自訂），三者互斥、單選
type ActiveView = { kind: 'all' } | { kind: 'category'; tag: AssetTag } | { kind: 'folder'; name: string }
const activeView = ref<ActiveView>({ kind: 'all' })
const foldersOpen = ref(false)
function setView(v: ActiveView) {
  activeView.value = v
  foldersOpen.value = false
}

const tabs = computed(() =>
  ['library', 'edit', 'retouch'].map((value) => ({ value, label: t(`library.tabs.${value}`) })),
)
const activeTab = ref('library')
const sources = computed(() =>
  ['all', 'upload', 'ai', 'edit'].map((value) => ({ label: t(`sources.${value}`), value })),
)
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
    return t('library.folderNote', { folder: activeView.value.name, count })
  }
  return t('library.note')
})

// 系統分類／我的資料夾的數量，都是從目前已載入的 assets 即時算出，不是後端另外提供的欄位
const categoryCounts = computed(() => {
  const map = new Map<AssetTag, number>()
  for (const c of categoryTags) map.set(c.tag, assets.value.filter((a) => a.tag === c.tag).length)
  return map
})
const folderCounts = computed(() => {
  const map = new Map<string, number>()
  for (const f of folders.value) map.set(f, assets.value.filter((a) => (a.folderId ?? UNFILED_FOLDER) === f).length)
  return map
})
const activeViewLabel = computed(() => {
  const view = activeView.value
  return view.kind === 'all' ? t('library.allAssets') : view.kind === 'category' ? t(`sources.${view.tag}`) : view.name
})
const activeViewCount = computed(() => {
  const view = activeView.value
  return view.kind === 'all'
    ? assets.value.length
    : view.kind === 'category'
      ? (categoryCounts.value.get(view.tag) ?? 0)
      : (folderCounts.value.get(view.name) ?? 0)
})

// 資料夾／系統分類（左）與來源（右上）、關鍵字是不同維度，可疊加過濾
const filtered = computed(() =>
  assets.value.filter((a) => {
    const v = activeView.value
    const byView =
      v.kind === 'all' ? true : v.kind === 'category' ? a.tag === v.tag : (a.folderId ?? UNFILED_FOLDER) === v.name
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
  await moveToFolder([...selectedIds.value], moveTargetFolder.value)
  moveDialogOpen.value = false
  clearSelection()
}

async function removeSelectedFromFolder() {
  if (activeView.value.kind !== 'folder') return
  await removeFromFolder([...selectedIds.value])
  clearSelection()
}

// 刪除確認：完整彈窗（縮圖預覽＋勾選「我了解此操作無法復原」才能刪除）
const deleteDialogOpen = ref(false)
const deleteConfirmed = ref(false)
useAccessibleDialog(moveDialogOpen, moveDialogRef, () => (moveDialogOpen.value = false))
useAccessibleDialog(deleteDialogOpen, deleteDialogRef, () => (deleteDialogOpen.value = false))
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
    @include flex(flex-start, center, 0.5rem);
    color: $gray-400;
    font-size: 0.875rem;
    padding: 0.75rem 0.875rem;
  }
  &__noteDot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: $blue;
    flex-shrink: 0;
  }
  &__body {
    display: flex;
    align-items: stretch; // 左右面板等高
    gap: 1rem;
    flex: 1; // 撐滿剩餘高度，白色面板接近底部
    min-height: 0;
    @include below($bp-lg) {
      flex-direction: column;
    }
  }
}
.tabs {
  @include flex(flex-start, center, 0.5rem);
  margin-bottom: 1rem;
  &__item {
    padding: 0.125rem 0.75rem;
    border-radius: 16px;
    font-size: 0.8125rem;
    line-height: 1;
    color: $dark-blue-gray;
    background: $white;
    border: 1px solid $gray;
    white-space: nowrap;
    flex-shrink: 0;
    &.isActive {
      background: $white;
      color: $blue-dark-500;
      border-color: #606692;
      font-weight: 500;
    }
  }
}

.mobileFolderToggle {
  display: none;
}
.folders {
  width: 13.75rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  @include below($bp-lg) {
    width: 100%;
  }
  background: $white;
  border-radius: 10px;
  box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2);
  padding: 1rem;
  &__section {
    @include flex(space-between, center);
    font-size: 0.75rem;
    color: $gray-100;
    margin: 0.875rem 0 0.375rem;
    padding: 0 0 0 0.75rem;
  }
  &__addIcon {
    display: grid;
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    place-items: center;
    margin: -0.25rem;
    padding: 0;
    color: $blue-dark-500;

    span {
      font-size: 0.875rem;
      font-weight: 500;
      line-height: normal;
      white-space: nowrap;
    }

    &:focus-visible {
      outline: 2px solid $yellow;
      outline-offset: 2px;
    }
  }
  &__item {
    @include flex(flex-start, center, 0.5rem);
    text-align: left;
    height: 2.25rem;
    padding: 0 0.625rem;
    border-radius: 8px;
    font-size: 0.875rem;
    color: $dark-blue-gray;
    &:hover {
      background: $blue-light;
    }
    &.isActive {
      background: #eef1f7;
      color: $blue-dark-500;
      font-weight: 500;
      border: 1.5px dashed $blue-dark-500;
      padding: 0 0.53125rem;
    }
    > span:first-child,
    &--folder &-name {
      flex: 1;
    }
  }
  &__itemIcon {
    color: $gray-100;
    font-size: 0.875rem;
    flex-shrink: 0;
  }
  &__itemName {
    flex: 1;
  }
  &__count {
    color: $gray-100;
    font-size: 0.75rem;
  }
  &.isActive &__count,
  &__item.isActive &__count {
    color: $blue-dark-500;
  }
  &__new {
    margin-top: 0.25rem;
    padding: 0 0.75rem;
  }
  &__input {
    width: 100%;
    height: 2.25rem;
    border: 1px solid $blue;
    border-radius: 8px;
    padding: 0 0.625rem;
    font-size: 0.875rem;
    color: $blue-dark-500;
    outline: none;
  }
  &__hint {
    color: $gray-100;
    font-size: 0.6875rem;
    line-height: 1.5;
    margin-top: 0.75rem;
    padding: 0 0.75rem;
  }
}
.assets {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: $white;
  border-radius: 10px;
  box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2);
  padding: 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
}
.assets__toolbar {
  @include flex(flex-start, center, 0.75rem);
  padding-right: 4.4375rem;
  margin-bottom: 1rem;
  @include below($bp-lg) {
    padding-right: 0;
  }
  @include below($bp-md) {
    flex-wrap: wrap;
    .assets__search {
      flex: 1 0 100%;
      width: 100%;
      max-width: none;
    }
    .assets__actions {
      flex: 1 0 100%;
    }
    .assets__actions > * {
      flex: 1;
    }
  }
}
.assets__actions {
  @include flex(flex-start, center, 0.75rem);
  margin-left: auto;
}
.assets__search {
  flex: 0 1 17.5rem;
}
.sources {
  @include flex(flex-start, center, 0.5rem);
  flex-shrink: 0;
  &__label {
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: #606692;
    margin-right: 0.125rem;
    white-space: nowrap;
  }
}

.chip {
  padding: 0.125rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8125rem;
  line-height: 1;
  color: $dark-blue-gray;
  border: 1px solid $gray;
  background: $white;
  white-space: nowrap;
  flex-shrink: 0;
  &.isActive {
    background: $white;
    color: $blue-dark-500;
    border-color: #606692;
    font-weight: 500;
  }
}
.upload__input {
  display: none;
}

@include below($bp-lg) {
  .mobileFolderToggle {
    @include flex(flex-start, center, 0.5rem);
    width: 100%;
    min-height: 2.75rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid $blue-dark-500;
    border-radius: 10px;
    background: $white;
    color: $blue-dark-500;
    text-align: left;
    box-shadow: $boxShadowDark;

    &__label {
      flex: 1;
      font-size: 0.875rem;
      font-weight: 700;
    }

    &__count {
      color: #606692;
      font-size: 0.75rem;
    }

    svg {
      font-size: 1rem;
    }
  }

  .folders {
    display: none;

    &.isMobileOpen {
      display: flex;
    }
  }
}

@include below($bp-sm) {
  .library {
    height: auto;
    min-height: 0;
    &__body {
      flex: none;
    }
  }
  .assets {
    flex: none;
    padding: 1rem;
  }
  .assets__toolbar {
    flex-direction: column;
    align-items: stretch;
    flex-wrap: nowrap;
    .assets__search,
    .assets__actions {
      flex: 0 0 auto;
    }

    .assets__search {
      width: 100%;
    }
  }
  .sources {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    padding-bottom: 0.25rem;
  }
  .assets__actions {
    width: 100%;
    margin-left: 0;
  }
  .assets__grid {
    flex: none;
    overflow-y: visible;
  }
}

.batchbar {
  @include flex(space-between, center);
  background: $blue-dark-500;
  color: $white;
  border-radius: 10px;
  padding: 0.875rem 1rem;
  margin-bottom: 1rem;
  &__selection {
    @include flex(flex-start, center, 0.875rem);
  }
  &__minus {
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0.5rem;
      height: 0.09375rem;
      background: $white;
      transform: translate(-50%, -50%);
    }
  }
  &__link {
    color: rgba(#a5c8e6, 0.85);
    font-size: 0.875rem;
    &:hover {
      color: $white;
    }
  }
  &__actions {
    @include flex(flex-start, center, 1.25rem);
  }
  &__action {
    min-width: 6.375rem;

    &:not(.batchbar__action--removeFromFolder) {
      color: $white;
    }
  }
}

// Mobile overrides follow the desktop batch bar so its fixed button sizing does not win the cascade.
@include below($bp-sm) {
  .batchbar {
    align-items: stretch;
    flex-direction: column;
    gap: 0.75rem;
    padding-inline: 0.625rem;
    &__selection,
    &__actions {
      flex-wrap: wrap;
      gap: 0.75rem;
      overflow: visible;
      padding-bottom: 0;
    }
    &__action {
      min-width: 0;
      padding-inline: 0.5rem;
    }
    &__actions > :deep(.appButton) {
      padding-inline: 0.625rem;
    }
  }
}

.assets__empty {
  flex: 1;
  color: $gray-100;
  font-size: 0.875rem;
  padding: 2.5rem 0;
  text-align: center;
}
.assets__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12.5rem, 15.75rem));
  column-gap: 1rem;
  row-gap: 1rem;
  @include below($bp-lg) {
    justify-content: center;
  }
  flex: 1; // 佔滿面板剩餘高度，讓分頁列貼齊底部
  align-content: flex-start; // 素材列靠上排列，不因多餘空間被拉開
  overflow-y: auto;
}
.asset {
  position: relative;
  padding: 0.25rem;
  border-radius: 10px;
  &.isSelected {
    background: $blue-light;
    box-shadow: inset 0 0 0 2px $blue-dark-500;
  }
  &__check {
    position: absolute;
    top: 0.625rem;
    left: 0.625rem;
    z-index: 1;
    cursor: pointer;
    input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
  }
  &__checkBox {
    @include flex(center, center);
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 4px;
    background: $white;
    border: 1px solid $gray;
    font-size: 0.6875rem;
    color: $white;
  }
  &.isSelected &__checkBox {
    background: $blue-dark-500;
    border-color: $blue-dark-500;
  }
  &__thumb {
    @include flex(center, center);
    aspect-ratio: 244 / 152;
    background: #eef1f7;
    border-radius: 8px;
    color: $babyBlue;
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }
  &__name {
    font-size: 0.875rem;
    font-weight: 500;
    color: $dark-blue-gray;
    margin-bottom: 0.125rem;
  }
  &__meta {
    @include flex(flex-start, center, 0.5rem);
  }
  &__dim {
    font-size: 0.75rem;
    color: $gray-100;
  }
}
// ── 生成中（背景任務）卡片：對齊設計稿 ──
.pending {
  @include flex(center, center, 0.75rem);
  flex-direction: column;
  aspect-ratio: 244 / 152;
  padding: 0 2.5rem;
  background: $blue-light; // 灰底 #eff2fa
  border-radius: 8px;
  margin-bottom: 0.5rem;
  &__play {
    @include flex(center, center);
    width: 1.875rem;
    height: 1.375rem;
    border-radius: 4px;
    background: $babyBlue; // #a5c8e6
    svg {
      display: block;
    }
  }
  &__pct {
    font-size: 0.875rem;
    font-weight: 500;
    color: $blue-dark-500; // #2e3567
  }
  &__bar {
    width: 100%;
    height: 0.375rem;
    border-radius: 3px;
    background: #dfe4f0; // 進度條軌道（灰底上的淺色）
    overflow: hidden;
  }
  &__barFill {
    height: 100%;
    border-radius: 3px;
    background: $blue-dark-500; // 深藍填色
    transition: width 0.3s;
  }
  &__eta {
    font-size: 0.8125rem;
    color: #606692;
  }
}
.asset__pmeta {
  font-size: 0.8125rem;
  color: $gray-100; // #b4b9c4
}
.spin {
  animation: spin 1s linear infinite;
}
.isUp {
  transform: rotate(180deg);
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.tag {
  font-size: 0.8125rem;
  padding: 0.125rem 0.75rem;
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
  margin-top: 1rem;
  @include below($bp-lg) {
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
  }
  &__total {
    font-size: 0.875rem;
    color: #606692;
    text-align: center;
  }
  &__pages {
    @include flex(flex-start, center, 0.25rem);
    @include below($bp-lg) {
      justify-content: center;
    }
  }
  &__nav,
  &__page {
    min-width: 1.75rem;
    height: 1.75rem;
    padding: 0 0.375rem;
    border-radius: 6px;
    font-size: 0.8125rem;
    color: #606692;
    &:hover:not(:disabled) {
      background: $blue-light;
    }
    &:disabled {
      color: $gray;
      cursor: not-allowed;
    }
    // 當前頁：無藍底、同色加粗、不可點（對齊設計稿）
    &.isActive {
      color: #606692;
      font-weight: 700;
      cursor: default;
      background: none;
    }
  }
  &__ellipsis {
    color: $gray-100;
    font-size: 0.8125rem;
    padding: 0 0.25rem;
  }
}

.modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(23, 30, 82, 0.45);
  @include flex(center, center);
  padding: 1.5rem;
}
.modal__box {
  width: 27.5rem;
  max-width: 100%;
  max-height: 88vh;
  background: $white;
  border-radius: 16px;
  padding: 1.375rem 1.5rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.modal__head {
  @include flex(space-between, center);
  margin-bottom: 0.5rem;
}
.modal__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: $blue-dark-300;
}
.modal__close {
  color: $gray-400;
  font-size: 1.25rem;
}
.modal__desc {
  font-size: 0.8125rem;
  color: $gray-400;
  margin-bottom: 0.875rem;
}
.modal__list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 13.75rem;
  overflow-y: auto;
  margin-bottom: 0.625rem;
}
.modal__listItem {
  width: 100%;
  @include flex(flex-start, center, 0.5rem);
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  color: $blue-dark-300;
  cursor: pointer;
  &:hover {
    background: $blue-light;
  }
  &.isActive {
    background: $blue-light;
    font-weight: 700;
  }
}
.modal__listName {
  flex: 1;
  text-align: left;
}
.modal__listCount {
  color: $gray-100;
  font-size: 0.75rem;
}
.modal__create {
  @include flex(flex-start, center, 0.5rem);
  margin-bottom: 1.125rem;
}
.modal__createInput {
  flex: 1;
  height: 2.5rem;
  border: 1px solid $gray;
  border-radius: 999px;
  padding: 0 1rem;
  font-size: 0.875rem;
  color: $blue-dark-300;
  outline: none;
  &:focus {
    border-color: $blue;
  }
}
.modal__createBtn {
  height: 2.5rem;
  padding: 0 1.125rem;
  border: 1px solid $gray;
  border-radius: 999px;
  font-size: 0.875rem;
  color: $blue-dark-300;
  white-space: nowrap;
}
.modal__foot {
  @include flex(flex-end, center, 0.625rem);
}
.modal__preview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.625rem;
  margin-bottom: 0.875rem;
}
.modal__previewThumb {
  @include flex(center, center);
  aspect-ratio: 4 / 3;
  background: $blue-light;
  border-radius: 8px;
  color: $babyBlue;
  font-size: 1.375rem;
  margin-bottom: 0.375rem;
}
.modal__previewName {
  display: block;
  font-size: 0.75rem;
  color: $blue-dark-300;
}
.modal__checkline {
  @include flex(flex-start, center, 0.5rem);
  font-size: 0.875rem;
  color: $blue-dark-300;
  margin-bottom: 1.125rem;
  cursor: pointer;
}
.modal__warn {
  @include flex(flex-start, center, 0.625rem); // 圖示上下置中（對齊設計稿）
  background: $blue-light;
  border-left: 3px solid #ff6148; // 左側橘紅長條
  border-radius: 8px;
  padding: 0.75rem 0.875rem;
  margin-bottom: 1rem;
}
.modal__warnIcon {
  width: 1.25rem;
  height: 1.25rem;
  color: #ff6148; // 實心三角填色
  flex-shrink: 0;
}
.modal__warnText {
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
    line-height: 1.5;
  }
}
.modal__textbtn {
  font-size: 0.875rem;
  font-weight: 600;
  color: $blue-dark-500;
  padding: 0.5rem 0.75rem;
  &--danger {
    color: $red;
    &:disabled {
      color: rgba($red, 0.4);
      cursor: not-allowed;
    }
  }
}
</style>
