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
        span.folders__count {{ allAssetsTotal }}
      .folders__section {{ t('library.systemCategories') }}
      button.folders__item(v-for="c in categoryTags" :key="c.tag" :class="{ 'isActive': activeView.kind === 'category' && activeView.tag === c.tag }" @click="setView({ kind: 'category', tag: c.tag, dimension: c.dimension })")
        span {{ t(`sources.${c.tag}`) }}
        span.folders__count {{ c.tag === 'object' ? counts[c.tag] + objectMaterialsCount : counts[c.tag] }}
      .folders__section.folders__section--folders
        span {{ t('library.myFolders') }}
        button.folders__addIcon(type="button" @click="startAddFolder" :aria-label="t('library.addFolder')")
          span(aria-hidden="true") ＋
      FolderRow(
        :name="unfiledFolderName"
        :count="folderImageCount(null)"
        :active="activeView.kind === 'folder' && activeView.folderId === null"
        @click="setView({ kind: 'folder', folderId: null, name: unfiledFolderName })"
      )
      FolderRow(
        v-for="f in folders"
        :key="f.folderId"
        :name="f.folderName"
        :count="f.imageCount"
        :active="activeView.kind === 'folder' && activeView.folderId === f.folderId"
        @click="setView({ kind: 'folder', folderId: f.folderId, name: f.folderName })"
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
        small.folders__error(v-if="folderError" role="alert") {{ folderError }}
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

      p.assets__error(v-if="batchError" role="alert") {{ batchError }}

      .batchbar(v-if="selectedIds.size")
        .batchbar__selection
          span.batchbar__minus
          span {{ t('library.selectedCount', { count: selectedIds.size }) }}
          button.batchbar__link(@click="selectAllOnPage") {{ t('library.selectPage', { count: pagedRealAssets.length }) }}
          button.batchbar__link(@click="clearSelection") {{ t('common.clear') }}
        .batchbar__actions
          AppButton.batchbar__action.batchbar__action--moveToFolder(variant="primary" @click="openMoveDialog") {{ t('library.moveToFolder') }}
          AppButton.batchbar__action.batchbar__action--removeFromFolder(variant="outline" v-if="activeView.kind === 'folder' && activeView.folderId !== null" @click="removeSelectedFromFolder") {{ t('library.removeFromFolder') }}
          AppButton.batchbar__action(variant="ghost" @click="downloadSelected") {{ t('common.download') }}
          AppButton(variant="alert" @click="openDeleteDialog")
            IconDelete
            | {{ t('common.delete') }}

      .assets__empty(v-if="loading && !pagedRealAssets.length && !pendingTasks.length && !showMaterials") {{ t('common.loading') }}
      .assets__empty(v-else-if="!pagedRealAssets.length && !pendingTasks.length && !showMaterials") {{ t('library.empty') }}
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
        template(v-if="showMaterials")
          p.assets__materialsLabel {{ t('library.builtinMaterials') }}
          AssetCard(
            v-for="m in pagedMaterials"
            :key="m.materialId"
            :name="m.materialName"
            :tag="m.category"
            :tag-label="materialCategoryLabel(m.category)"
            dimensions=""
            :url="m.url"
            :selectable="false"
          )
        AssetCard(
          v-for="a in pagedRealAssets"
          :key="a.id"
          :name="a.name"
          :tag="a.source"
          :tag-label="$t(`sources.${a.source}`)"
          :dimensions="a.dim"
          :type="a.type"
          :url="a.url"
          :selected="selectedIds.has(a.id)"
          @toggle="toggleSelect(a.id)"
        )

      .pagination(v-if="displayTotal")
        span.pagination__total {{ t('library.totalAssets', { count: displayTotal }) }}
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
          li(v-for="f in folders" :key="f.folderId")
            button.modal__listItem(type="button" :aria-pressed="moveTargetFolder === f.folderId" :class="{ 'isActive': moveTargetFolder === f.folderId }" @click="moveTargetFolder = f.folderId")
              IconFolder
              span.modal__listName {{ f.folderName }}
              span.modal__listCount {{ f.imageCount }}
          li
            // 「未分類」不是後端 folders 清單的一員，是用 unfiledCount 組裝的虛擬選項；
            // 排在真實資料夾之後（對齊 Figma 442:2860 的順序）。選到它時不能走
            // moveToFolder（需要真的 folderId），要改呼叫 removeFromFolder 把 folderId 設回 null。
            button.modal__listItem(type="button" :aria-pressed="moveTargetFolder === null" :class="{ 'isActive': moveTargetFolder === null }" @click="moveTargetFolder = null")
              IconFolder
              span.modal__listName {{ unfiledFolderName }}
              span.modal__listCount {{ unfiledCount }}
        .modal__create
          input.modal__createInput(v-model="moveNewFolderName" type="text" :aria-label="t('library.createFolderPlaceholder')" :placeholder="t('library.createFolderPlaceholder')" @keyup.enter="createFolderForMove")
          AppButton.modal__createBtn(variant="ghost" size="compact" @click="createFolderForMove") {{ t('common.create') }}
        small.modal__error(v-if="moveDialogError" role="alert") {{ moveDialogError }}
        footer.modal__foot
          AppButton(variant="outline" @click="moveDialogOpen = false") {{ t('common.cancel') }}
          AppButton(variant="primary" :disabled="moveTargetFolder === undefined" @click="confirmMoveToFolder") {{ t('library.moveInto', { folder: moveTargetFolderName }) }}

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
          IconAlertTriangleFilled.modal__warnIcon(color="currentColor")
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
import {
  IconAlertTriangleFilled,
  IconChevronDown,
  IconClose,
  IconDelete,
  IconFolder,
  IconImagePlaceholder,
  IconMovie,
  IconPlayTriangle,
  IconUpload,
} from '@/components/icons'
import ImageEditorWorkspace from '@/components/ImageEditorWorkspace.vue'
import {
  CATEGORY_TAGS,
  UNFILED_FOLDER,
  type Asset,
  type AssetSource,
  type CategoryTag,
  type ImageListQuery,
  type ImageListResponse,
} from '@/types/asset'
import type { Material } from '@/types/asset'
import { api } from '@/api'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'
import { isDuplicateName, isFileTooLarge, isFolderLimitExceeded, isUnsupportedFormat } from '@/utils/error'

const {
  assets,
  total,
  page,
  counts,
  loading,
  load,
  folders,
  unfiledCount,
  loadFolders,
  addFolder,
  moveToFolder,
  removeFromFolder,
  deleteAssets,
  upload,
} = useAssets()
const { t } = useI18n()
const moveDialogRef = ref<HTMLElement | null>(null)
const deleteDialogRef = ref<HTMLElement | null>(null)
const uploadInput = ref<HTMLInputElement | null>(null)
const materials = ref<Material[]>([])

const materialCategoryLabels: Record<Material['category'], string> = {
  background: '背景素材',
  object: '物件素材',
  model: '模特素材',
}
function materialCategoryLabel(category: Material['category']): string {
  return materialCategoryLabels[category]
}
// 內建素材不屬於任何資料夾，但「分類」是例外：素材本身有 category（background／object／model），
// 跟系統分類的「物件素材」（source === 'object'，使用者自己的圖庫）剛好標籤撞名，使用者會很自然
// 以為點「物件素材」分類就看得到標「物件素材」的內建素材卡片——所以這裡讓兩者真的合流。
// 「背景素材」「模特素材」目前沒有對應的系統分類（見 CATEGORY_TAGS），所以只在「全部素材」出現；
// 資料夾／關鍵字搜尋／其他系統分類仍然不會混入任何內建素材，避免使用者誤以為那些篩選結果裡有它們。
// 使用者要求「來源」工具列（全部／上傳／AI生成／編輯產物）要照字面篩選：選了「物件素材」
// 系統分類、又選「上傳」來源，兩個都是 source 欄位、字面上不可能同時成立（一張圖的
// source 只能是一個值），這種組合就該照字面顯示「沒有符合的素材」，而不是像過去那樣
// 讓 chip 看起來能點、點了卻完全沒反應。
const sourceConflictsWithCategory = computed(() => {
  const v = activeView.value
  return (
    v.kind === 'category' && v.dimension === 'source' && activeSource.value !== 'all' && activeSource.value !== v.tag
  )
})
const objectMaterialsCount = computed(() => materials.value.filter((m) => m.category === 'object').length)
// 會混入內建素材的檢視：「全部素材」、「未分類」資料夾（內建素材本來就沒有資料夾歸屬，
// 理所當然算未分類）、跟系統分類裡的「物件素材」（見下面 materialsForView 的分類篩選）。
const mergesMaterials = computed(() => {
  const v = activeView.value
  if (v.kind === 'all') return true
  if (v.kind === 'category' && v.dimension === 'source' && v.tag === 'object') return true
  if (v.kind === 'folder' && v.folderId === null) return true
  return false
})
const materialsForView = computed<Material[]>(() => {
  if (!mergesMaterials.value) return []
  // 「來源」工具列選到「全部」以外的值時，內建素材要整批消失：素材字面上沒有「來源」
  // 這個欄位，不算「上傳」也不算「AI 生成」，選了具體來源卻還看得到內建素材會誤導使用者。
  if (activeSource.value !== 'all') return []
  const v = activeView.value
  // 「物件素材」分類只混同分類的內建素材；「全部素材」跟「未分類」沒有分類限制，全部混進去。
  if (v.kind === 'category') return materials.value.filter((m) => m.category === 'object')
  return materials.value
})

// 內建素材（materialsForView）永遠整批載入、不分頁；使用者自己的圖庫在會合流的檢視裡
// 也已經整批撈回來（見 fetchAllRealAssets），兩邊在這裡合併成一份虛擬清單，依內建素材
// 排在前、真實素材排在後的順序，用 PAGE_SIZE 在前端切出目前這一頁。
const pagedMaterials = computed(() => {
  if (sourceConflictsWithCategory.value) return []
  const start = (page.value - 1) * PAGE_SIZE
  return materialsForView.value.slice(start, start + PAGE_SIZE)
})
const pagedRealAssets = computed(() => {
  if (sourceConflictsWithCategory.value) return []
  if (!mergesMaterials.value) return assets.value
  const start = (page.value - 1) * PAGE_SIZE
  const end = page.value * PAGE_SIZE
  const realStart = Math.max(0, start - materialsForView.value.length)
  const realEnd = Math.max(0, end - materialsForView.value.length)
  return assets.value.slice(realStart, realEnd)
})
const showMaterials = computed(() => pagedMaterials.value.length > 0)

// 左下角「共 N 筆素材」、手機版切換列的數字（會合流內建素材的檢視）都要跟畫面上看得到的
// 東西一致：目前這個檢視查到的使用者圖庫張數（total，query-scoped，換檢視就會變）
// 加上這個檢視會顯示的內建素材數（materialsForView，非合流檢視或來源衝突時是空陣列）。
// sourceConflictsWithCategory 時兩邊字面上都不該有東西，直接歸零。
const displayTotal = computed(() =>
  sourceConflictsWithCategory.value ? 0 : total.value + materialsForView.value.length,
)

// 側欄「全部素材」徽章要跟「目前選哪個檢視」無關、永遠顯示整個圖庫的總數，不能用
// displayTotal（那個會隨目前檢視變動）——要用 counts.all，這是後端 count_by_bucket()
// 算出來的，不受目前篩選條件影響的權威值（見 useAssets.ts 的 counts 註解）。
const allAssetsTotal = computed(() => counts.value.all + materials.value.length)

// 不會合流內建素材的視圖（資料夾／大部分系統分類）是伺服器分頁，assets 只有「目前這一頁」
// 的內容；會合流內建素材的視圖（見 mergesMaterials）為了合併分頁，assets 改成整批撈回來
// （見 fetchAllRealAssets）。不管哪種情況，
// 批次選取都允許跨頁累積（見下方 selectedIds），刪除確認彈窗要秀出所有已選素材的縮圖與
// 名稱，不能只看目前這頁看得到的。這裡把每次載入過的素材都記下來，選取時就查得到完整資料。
const assetCache = ref<Record<string, Asset>>({})
watch(
  assets,
  (list) => {
    const next = { ...assetCache.value }
    for (const a of list) next[a.id] = a
    assetCache.value = next
  },
  { immediate: true },
)

function errorMessage(e: unknown, fallback: string): string {
  if (isDuplicateName(e)) return t('errors.duplicateFolderName')
  if (isFolderLimitExceeded(e)) return t('errors.folderLimitExceeded')
  if (isFileTooLarge(e)) return t('errors.fileTooLarge')
  if (isUnsupportedFormat(e)) return t('errors.unsupportedFormat')
  return fallback
}

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
// 「未分類」不是後端 folders 清單裡的一員，是用 unfiledCount 組裝的固定置頂虛擬項目
// （沿用 SaveAssetDialog.vue 既有作法：直接用常數字面值，這個詞目前沒有走 i18n）
const unfiledFolderName = UNFILED_FOLDER

// 生成中卡片的剩餘時間：後端未提供 eta，依進度以約 2 分鐘估算（僅顯示用）
function etaText(progress: number) {
  const remain = Math.max(5, Math.round(((100 - progress) / 100) * 120))
  const m = Math.floor(remain / 60)
  const s = remain % 60
  return m > 0
    ? t('common.remainingMinutesSeconds', { minutes: m, seconds: s })
    : t('common.remainingSeconds', { seconds: s })
}

// 左側主要篩選：全部素材／系統分類（依 source 或 mediaType）／我的資料夾（使用者自訂），三者互斥、單選。
// 系統分類混了兩個維度（object／aiGenerate／edit 是來源；video 是媒體型態），
// dimension 記著該用查詢的哪個欄位比對，避免把 video 誤當成一種 source 送給後端。
// folder 檢視的 folderId 為 null 時代表「未分類」——比照後端 folderId 三態語意
// （見 design.md 決策 1）：這不是某個真實資料夾，是用 unfiledCount 組裝出來、固定置頂的虛擬項目。
type ActiveView =
  | { kind: 'all' }
  | { kind: 'category'; tag: CategoryTag; dimension: 'source' | 'mediaType' }
  | { kind: 'folder'; folderId: string | null; name: string }
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
  ['all', 'upload', 'aiGenerate', 'edit'].map((value) => ({ label: t(`sources.${value}`), value })),
)
const activeSource = ref('all')
const keyword = ref('')
const batchError = ref('')

const PAGE_SIZE = 8

// 資料夾／系統分類（左）＋來源（右上）＋關鍵字組成後端查詢條件。
// 分類與來源同屬 source 維度：兩者同時指定會做出恆為空的交集，這裡讓「系統分類」優先，
// 只在不是分類檢視時才套用來源 chip，避免疊出使用者看不懂的空清單。
function buildQuery(): ImageListQuery {
  const q: ImageListQuery = { page: page.value, pageSize: PAGE_SIZE }
  const v = activeView.value
  if (v.kind === 'category') {
    if (v.dimension === 'mediaType') {
      // 影片分類跟「來源」是不同欄位（mediaType vs source），兩個可以真的疊起來一起篩，
      // 不像下面 source 維度的分類那樣會撞欄位——這裡才要真的把來源 chip 送給後端。
      q.mediaType = 'video'
      if (activeSource.value !== 'all') q.source = activeSource.value as AssetSource
    } else {
      // 物件／AI 生成／編輯產物這幾個系統分類本身就是 source 欄位，跟上面的來源 chip
      // 是同一個欄位——後端一次只能篩一個值，沒辦法疊出「物件 AND 上傳」的交集，
      // 這裡維持送分類本身的值；chip 選到別的值時，交集在定義上是空的，交給
      // sourceConflictsWithCategory 在畫面上照字面清空，而不是在這裡硬塞兩個值。
      q.source = v.tag as AssetSource
    }
  } else {
    if (v.kind === 'folder') q.folderId = v.folderId
    if (activeSource.value !== 'all') q.source = activeSource.value as AssetSource
  }
  if (keyword.value) q.q = keyword.value
  return q
}

// 「全部素材」要跟內建素材合併分頁（materials + 使用者自己的圖庫混在同一組頁碼裡），
// 但內建素材完全不分頁、使用者圖庫是後端分頁——兩邊分頁機制不一樣，沒辦法直接合併查詢。
// 做法：這個檢視改成把使用者自己的圖庫「一次全部撈完」，回來後跟 materials 一起交給
// pagedMaterials／pagedRealAssets 在前端切頁。後端 page_size 上限是 100
// （app/schemas/image.py），超過 100 筆要分好幾次要，這裡用迴圈把每一頁都撈回來。
const REAL_FETCH_PAGE_SIZE = 100
async function fetchAllRealAssets(filters: Omit<ImageListQuery, 'page' | 'pageSize'>) {
  let collected: Asset[] = []
  let p = 1
  let total = Infinity
  let counts = null as ImageListResponse['counts'] | null
  for (;;) {
    const res = await api.listImages({ ...filters, page: p, pageSize: REAL_FETCH_PAGE_SIZE })
    collected = collected.concat(res.items)
    total = res.total
    counts = res.counts
    // 保險：後端回傳異常（例如 items 空但 total 還沒撈完）時別無限迴圈下去
    if (res.items.length === 0 || collected.length >= total) break
    p += 1
  }
  return { items: collected, total, counts: counts! }
}

async function fetchAssets() {
  if (mergesMaterials.value) {
    loading.value = true
    try {
      const { page: _page, pageSize: _pageSize, ...filters } = buildQuery()
      const res = await fetchAllRealAssets(filters)
      assets.value = res.items
      total.value = res.total
      counts.value = res.counts
      // page.value 維持使用者目前點的頁碼——這裡是前端自己切頁，不能被後端回傳蓋掉
    } finally {
      loading.value = false
    }
    return
  }
  await load(buildQuery())
}

onMounted(() => {
  loadFolders()
  fetchAssets()
  api.listMaterials().then((res) => {
    materials.value = res.items
  })
})

// 頂部提示文字：檢視「全部素材」／系統分類時顯示機器人情境；檢視某個資料夾時改顯示該資料夾的說明
function folderImageCount(folderId: string | null): number {
  // 「未分類」不只是使用者自己沒歸檔的圖片——內建素材本來就沒有資料夾這個概念，
  // 邏輯上也都算「未分類」，所以這裡跟 mergesMaterials／materialsForView 一樣要加進去。
  if (folderId === null) return unfiledCount.value + materials.value.length
  return folders.value.find((f) => f.folderId === folderId)?.imageCount ?? 0
}

const noteText = computed(() => {
  const view = activeView.value
  if (view.kind === 'folder') {
    return t('library.folderNote', { folder: view.name, count: folderImageCount(view.folderId) })
  }
  return t('library.note')
})

const activeViewLabel = computed(() => {
  const view = activeView.value
  if (view.kind === 'all') return t('library.allAssets')
  if (view.kind === 'category') return t(`sources.${view.tag}`)
  return view.name
})
const activeViewCount = computed(() => {
  const view = activeView.value
  if (view.kind === 'folder') return folderImageCount(view.folderId)
  // 'all' 跟 'category' 都改用 displayTotal：已經考慮了目前這個檢視混了哪些內建素材、
  // 以及來源 chip 選到衝突組合時要歸零，跟畫面上實際顯示的東西保持一致。
  return displayTotal.value
})

const totalPages = computed(() => Math.max(1, Math.ceil(displayTotal.value / PAGE_SIZE)))

// 篩選條件切換時重回第 1 頁；先前的批次選取多半已經不對應目前畫面上看到的素材，直接清空避免誤操作
watch([activeView, activeSource], () => {
  page.value = 1
  clearSelection()
})
// 分頁與篩選條件共用同一支查詢；三者任一變動都重打 GET /images
watch([activeView, activeSource, page], fetchAssets)

// 關鍵字搜尋做小小 debounce，不然每敲一個字就打一次後端
let keywordTimer: ReturnType<typeof setTimeout> | undefined
watch(keyword, () => {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    page.value = 1
    clearSelection()
    fetchAssets()
  }, 300)
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
  // 「全選本頁」要跟畫面上這一頁看得到的真實素材一致——「全部素材」視圖的 assets
  // 現在整批撈回來給合併分頁用，不能直接拿來全選，否則會把其他頁的素材也選進去。
  for (const a of pagedRealAssets.value) next.add(a.id)
  selectedIds.value = next
}
function clearSelection() {
  selectedIds.value = new Set()
  batchError.value = ''
}

// 移至資料夾：完整彈窗（單選目標資料夾，可就地建立新資料夾）
// moveTargetFolder：string＝真實資料夾、null＝未分類、undefined＝尚未選擇（理論上不會發生，
// 因為「未分類」一定是可選項之一，但 openMoveDialog 之外的初始值還是留著這個保險狀態）
const moveDialogOpen = ref(false)
const moveTargetFolder = ref<string | null | undefined>(undefined)
const moveNewFolderName = ref('')
const moveDialogError = ref('')
const moveTargetFolderName = computed(() => {
  if (moveTargetFolder.value === null) return unfiledFolderName
  return folders.value.find((f) => f.folderId === moveTargetFolder.value)?.folderName ?? ''
})
function openMoveDialog() {
  moveTargetFolder.value = folders.value[0]?.folderId ?? null
  moveNewFolderName.value = ''
  moveDialogError.value = ''
  moveDialogOpen.value = true
}
async function createFolderForMove() {
  const name = moveNewFolderName.value.trim()
  if (!name) return
  moveDialogError.value = ''
  try {
    const folder = await addFolder(name)
    moveTargetFolder.value = folder.folderId
    moveNewFolderName.value = ''
  } catch (e) {
    moveDialogError.value = errorMessage(e, t('errors.submitFailed'))
  }
}
async function confirmMoveToFolder() {
  // 先存成區域變數才能讓 TypeScript 正確窄化型別（ref.value 跨陳述式不會自動窄化）
  const target = moveTargetFolder.value
  if (target === undefined) return
  // 移到「未分類」＝跟「移出資料夾」同一件事（folderId 設回 null），
  // 後端沒有「移到 null」這種 moveToFolder 語意，要改走 removeFromFolder
  const result =
    target === null
      ? await removeFromFolder([...selectedIds.value])
      : await moveToFolder([...selectedIds.value], target)
  moveDialogOpen.value = false
  clearSelection()
  await fetchAssets()
  await loadFolders(true) // 資料夾與未分類的 imageCount 都可能變了
  if (result.failedIds.length) batchError.value = t('library.batchFailed', { count: result.failedIds.length })
}

async function removeSelectedFromFolder() {
  // 已經在「未分類」檢視裡就沒有「移出資料夾」這個動作可做——素材本來就沒有歸屬
  if (activeView.value.kind !== 'folder' || activeView.value.folderId === null) return
  const result = await removeFromFolder([...selectedIds.value])
  clearSelection()
  await fetchAssets()
  await loadFolders(true)
  if (result.failedIds.length) batchError.value = t('library.batchFailed', { count: result.failedIds.length })
}

// 刪除確認：完整彈窗（縮圖預覽＋勾選「我了解此操作無法復原」才能刪除）
const deleteDialogOpen = ref(false)
const deleteConfirmed = ref(false)
useAccessibleDialog(moveDialogOpen, moveDialogRef, () => (moveDialogOpen.value = false))
useAccessibleDialog(deleteDialogOpen, deleteDialogRef, () => (deleteDialogOpen.value = false))
// assets 現在只有「目前這一頁」的內容，跨頁選取的素材要查 assetCache 才找得到完整資料
const selectedAssets = computed(() =>
  [...selectedIds.value].map((id) => assetCache.value[id]).filter((a): a is Asset => !!a),
)
// 被生成結果引用（作為來源／參考圖）的選取素材數；刪除會斷開這些生成紀錄的來源鏈
const referencedCount = computed(() => selectedAssets.value.filter((a) => (a.referencedBy ?? 0) > 0).length)
function openDeleteDialog() {
  deleteConfirmed.value = false
  deleteDialogOpen.value = true
}
async function confirmDelete() {
  const result = await deleteAssets([...selectedIds.value])
  deleteDialogOpen.value = false
  clearSelection()
  await fetchAssets()
  await loadFolders(true)
  // 後端目前還沒有任何地方會把 isInUse 設成 true，所以這條路徑實務上還不會被觸發，
  // 但介面先接好：真的發生時要讓使用者知道「還有 N 筆沒刪成功」，而不是靜靜失敗。
  if (result.failedIds.length) batchError.value = t('library.batchFailed', { count: result.failedIds.length })
}

function downloadSelected() {
  for (const a of selectedAssets.value) {
    if (!a.url) continue // mock 素材沒有真實檔案，跳過
    const link = document.createElement('a')
    link.href = a.url
    link.download = a.name
    link.target = '_blank'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}

// 新增資料夾（行內輸入）
const addingFolder = ref(false)
const newFolderName = ref('')
const folderInput = ref<HTMLInputElement | null>(null)
const folderError = ref('')

async function startAddFolder() {
  addingFolder.value = true
  newFolderName.value = ''
  folderError.value = ''
  await nextTick()
  folderInput.value?.focus()
}
async function confirmAddFolder() {
  const name = newFolderName.value.trim()
  if (!name) {
    addingFolder.value = false
    return
  }
  folderError.value = ''
  try {
    const folder = await addFolder(name)
    setView({ kind: 'folder', folderId: folder.folderId, name: folder.folderName }) // 建好即切到新資料夾
    addingFolder.value = false
  } catch (e) {
    // 失敗時保留輸入框，讓使用者看得到錯誤訊息並可以直接修正重試
    folderError.value = errorMessage(e, t('errors.submitFailed'))
  }
}
function cancelAddFolder() {
  addingFolder.value = false
  folderError.value = ''
}

async function onUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || !files.length) return
  // 上傳落到目前所在資料夾；本來就在瀏覽「未分類」（folderId: null）或不在任何資料夾檢視時，
  // 都不帶 folderId，讓後端預設落在未分類——upload() 只接受 string | undefined，null 要正規化掉
  const target = activeView.value.kind === 'folder' ? (activeView.value.folderId ?? undefined) : undefined
  let failed = 0
  for (const f of Array.from(files)) {
    try {
      await upload(f, target)
    } catch {
      failed += 1
    }
  }
  input.value = '' // 清空，讓同一檔案再次選取也能觸發 change
  await fetchAssets()
  await loadFolders(true)
  if (failed) batchError.value = t('library.uploadFailed', { count: failed })
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
  &__error {
    display: block;
    color: $red;
    font-size: 0.75rem;
    margin-top: 0.25rem;
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
  padding: 0.25rem 1rem;
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
.assets__error {
  color: $red;
  font-size: 0.8125rem;
  margin-bottom: 0.75rem;
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
// 內建素材跟使用者自己的素材混在同一個 grid 裡，用一行小字隔開，
// 標明這批是內建素材（下方「共 N 筆素材」已經把這批算進去了，見 displayTotal 註解）
.assets__materialsLabel {
  grid-column: 1 / -1;
  margin: 0;
  color: $gray-100;
  font-size: 0.75rem;
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
  // 對齊 Figma opt_春季檔期／opt_常用商品圖（node 442:2870、442:2876）：未選取的列是
  // 較淡的 $dark-blue-gray，只有選取列才換成較深的 $blue-dark-500 並加淺藍底
  color: $dark-blue-gray;
  cursor: pointer;
  &:hover {
    background: $blue-light;
  }
  &.isActive {
    background: $blue-light;
    color: $blue-dark-500;
    font-weight: 500;
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
.modal__error {
  display: block;
  color: $red;
  font-size: 0.75rem;
  margin: -0.75rem 0 1rem;
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
  // 對齊 Figma row_new 的 btn（node 442:2891）：深藍描邊＋深藍文字＋一點投影，
  // 不是原本套用的灰色描邊（那是 AppButton ghost variant 的預設樣式，這裡要蓋掉）
  border: 1px solid $blue-dark-500;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: $blue-dark-500;
  white-space: nowrap;
  box-shadow: 0 4px 2px rgba(0, 0, 0, 0.25);
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
.modal__previewItem {
  // grid item 預設 min-width: auto，文字不換行時會撐開欄寬讓 ellipsis 失效，
  // 名稱過長要能被截斷（PR review 回饋）就要讓它可以縮到比內容窄
  min-width: 0;
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
  overflow: hidden;
  font-size: 0.75rem;
  color: $blue-dark-300;
  text-overflow: ellipsis;
  white-space: nowrap;
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
