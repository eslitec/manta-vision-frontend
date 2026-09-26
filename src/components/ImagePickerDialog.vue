<template lang="pug">
Teleport(to="body")
  .picker(v-if="open" @click.self="close")
    //- 拖放掛在整個彈窗（涵蓋格線）：檔案放偏一點也會上傳，不會讓瀏覽器直接開啟那個檔案
    .picker__modal(
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descriptionId"
      tabindex="-1"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    )
      header.picker__head
        div
          .picker__title(:id="titleId") {{ resolvedTitle }}
          .picker__sub(:id="descriptionId") {{ resolvedSubtitle }}
        button.picker__close(data-dialog-initial-focus @click="close" :aria-label="t('common.close')")
          IconClose
      .picker__toolbar
        AppSearchbar.picker__search(v-model="keyword" :label="t('imagePicker.searchPlaceholder')" :placeholder="t('imagePicker.searchPlaceholder')")
        .sources(v-if="mode !== 'object'")
          button.chip(v-for="s in sources" :key="s.label" :aria-pressed="activeSource === s.value" :class="{ 'isActive': activeSource === s.value }" @click="activeSource = s.value") {{ s.label }}
      p.picker__error(v-if="uploadError" role="alert") {{ uploadError }}
      input(ref="fileInput" type="file" :accept="uploadAccept" hidden @change="onFileChange")
      .picker__grid
        //- 格線第一格固定是上傳卡片；上傳中用 aria-disabled 不用 disabled，免得已聚焦的按鈕失焦、焦點掉出彈窗
        button.pick.pick--upload(
          type="button"
          :class="{ isDragging: dragging }"
          :aria-label="t('imagePicker.uploadLabel')"
          :aria-busy="uploading"
          :aria-disabled="uploadBlocked"
          @click="openFilePicker"
        )
          .pick__thumb
            IconLoader.pick__spinner(v-if="uploading")
            IconAddObject(v-else)
            span.pick__uploadText {{ uploading ? t('imagePicker.uploading') : t('imagePicker.upload') }}
        button.pick(v-for="a in filtered" :key="a.id" :aria-pressed="selectedIds.includes(a.id)" :class="{ 'isSelected': selectedIds.includes(a.id) }" @click="toggle(a.id)")
          .pick__thumb
            span.pick__check(:class="{ isOn: selectedIds.includes(a.id) }" aria-hidden="true")
              IconCheck(v-if="selectedIds.includes(a.id)")
            IconMovie(v-if="a.type === 'video'")
            img.pick__thumbImage(v-else-if="a.url && !brokenIds.has(a.id)" :src="a.url" :alt="a.name" @error="markBroken(a.id)")
            IconImagePlaceholder(v-else)
          .pick__meta
            span.pick__name {{ a.name }}
            span.tag {{ sourceLabel(a.source) }}
      footer.picker__foot
        span.picker__count {{ t('imagePicker.selectedCount', { count }) }}
        .picker__actions
          AppButton(variant="outline" @click="close") {{ t('common.cancel') }}
          AppButton(variant="primary" :disabled="!count || uploading" @click="confirm") {{ multiple ? t('imagePicker.addSelected', { count }) : t('imagePicker.selectOne') }}
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAssets } from '@/composables/useAssets'
import { SUPPORTED_UPLOAD_FORMATS } from '@/api/mock'
import AppButton from '@/components/AppButton.vue'
import AppSearchbar from '@/components/AppSearchbar.vue'
import { IconAddObject, IconCheck, IconClose, IconImagePlaceholder, IconLoader, IconMovie } from '@/components/icons'
import type { Asset, AssetSource } from '@/types/asset'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'
import { useSessionStore } from '@/stores/session'
import { isListedInPicker, uploadErrorMessage } from '@/utils/imagePicker'

// mode：'asset'（預設）＝挑要編輯／當底圖的素材，維持既有過濾（不列內建，見 filtered 說明）；
// 'object'＝編輯器「加入物件」挑圖，只列 GET /images?source=object（後端已含內建物件），
// 且不過濾內建——物件圖層只拿 url 畫在畫布上、不把 id 送後端，內建素材在這裡選了不會 404。
const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    multiple?: boolean
    mode?: 'asset' | 'object'
    /** 這個彈窗不該列出的來源（例如試穿頁選服飾時不列模特照——後端不擋，選了會扣點生出無意義的結果） */
    excludeSources?: AssetSource[]
  }>(),
  {
    title: undefined,
    subtitle: undefined,
    multiple: false,
    mode: 'asset',
    excludeSources: () => [],
  },
)
const emit = defineEmits<{
  (e: 'select', asset: Asset): void
  (e: 'select-many', assets: Asset[]): void
}>()
const open = defineModel<boolean>('open', { required: true })
const dialogRef = ref<HTMLElement | null>(null)
const titleId = `image-picker-title-${crypto.randomUUID()}`
const descriptionId = `image-picker-description-${crypto.randomUUID()}`

const { assets, load, loading, upload } = useAssets()
const { t } = useI18n()
const session = useSessionStore()

const keyword = ref('')
const resolvedTitle = computed(() => props.title ?? t('imagePicker.defaultTitle'))
const resolvedSubtitle = computed(() => props.subtitle ?? t('imagePicker.subtitle', { name: session.botName }))
// 設計稿 dlg_filter（node 125:579）只有三個篩選 pill；編輯產物沒有獨立篩選，
// 但仍會出現在「全部」的清單裡（設計稿的 dlg_grid 就有一張標「編輯產物」）。
const sources = computed(() => [
  { label: t('sources.all'), value: 'all' },
  { label: t('sources.upload'), value: 'upload' },
  { label: t('sources.aiGenerate'), value: 'aiGenerate' },
])
const activeSource = ref('all')
const selectedIds = ref<string[]>([])
// 素材有 url 才畫真圖，網址失效（載入失敗）就記下來退回內建示意圖示，不留破圖
const brokenIds = ref<Set<string>>(new Set())
function markBroken(id: string) {
  brokenIds.value = new Set(brokenIds.value).add(id)
}

const count = computed(() => selectedIds.value.length)
const sourceLabel = (source: string) => t(`sources.${source}`)

// 篩選跟關鍵字都在前端做（不像圖庫頁另外打 GET /images）：這個彈窗一次把整個圖庫拉回來
// （pageSize 帶到後端上限 100），資料量不大，本地篩選比每次點 pill／打字都重打一次後端划算；
// 真的超過 100 筆時目前沒有翻頁 UI，會看不到後面的素材——量體大到那個程度前，這裡先不做分頁。
//
// 內建素材（source='builtin'）除物件模式外一律不列：後端 GET /images 不帶 source 時會把它們合併進來，
// 但生成／編輯／試穿的底圖、參考圖、商品圖端點只查 images 表，選了 materialId 會 404。
// 後端沒有「排除內建」的參數，所以在前端過濾；內建素材 createdAt 最舊、排在這一頁的尾端，
// 過濾掉不會讓使用者自己的圖變少（見 library-builtin-source design.md 決策 6）。規則在 isListedInPicker。
const filterState = computed(() => ({
  mode: props.mode,
  excludeSources: props.excludeSources,
  source: activeSource.value,
  keyword: keyword.value,
}))
const filtered = computed(() => assets.value.filter((a) => isListedInPicker(a, filterState.value)))

function toggle(id: string) {
  if (props.multiple) {
    const i = selectedIds.value.indexOf(id)
    if (i >= 0) selectedIds.value.splice(i, 1)
    else selectedIds.value.push(id)
  } else {
    selectedIds.value = [id] // 單選：只保留一張
  }
}

// ── 直接上傳（picker-direct-upload）：六個使用處共用這一份，各 view 不必改 ──
// 大小／格式交給 API 層（mock 與真後端）判斷，這裡的 accept 只是檔案選擇視窗的預設過濾
const uploadAccept = SUPPORTED_UPLOAD_FORMATS.map((ext) => `.${ext}`).join(',')
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')
const dragging = ref(false)
// 清單還在 load() 時也不收：GET /images 晚一步回來會把剛插入的新圖蓋掉
const uploadBlocked = computed(() => uploading.value || loading.value)

function openFilePicker() {
  if (!uploadBlocked.value) fileInput.value?.click()
}
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 清空，同一個檔案失敗後再選一次也會觸發 change
  if (file) uploadFile(file)
}
// ponytail: 拖放與檔案選擇都只取第一個檔案——六個使用處都是單選；要多檔再改成逐一上傳
function onDrop(e: DragEvent) {
  dragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) uploadFile(file)
}
async function uploadFile(file: File) {
  if (uploadBlocked.value) return
  uploading.value = true
  uploadError.value = ''
  try {
    // 物件模式的清單是 GET /images?source=object，新圖要標 object 下次才列得到；其他模式是一般上傳
    const asset = await upload(file, undefined, undefined, undefined, props.mode === 'object' ? 'object' : undefined)
    // 本地插到最上方，不重打 GET /images：回應就是完整的素材，後端也是 createdAt 倒序。
    // 上傳中關掉又重開時，重開的 GET /images 可能已經帶到這張，不再插一次
    if (!assets.value.some((a) => a.id === asset.id)) assets.value.unshift(asset)
    // 目前的篩選／搜尋會藏住新圖才切回全部並清空搜尋；看得見就不動使用者的篩選
    if (!isListedInPicker(asset, filterState.value)) {
      activeSource.value = 'all'
      keyword.value = ''
    }
    // 沿用 toggle 的選取語意：單選取代、多選加入
    selectedIds.value = props.multiple ? [...selectedIds.value, asset.id] : [asset.id]
  } catch (e) {
    uploadError.value = uploadErrorMessage(e, t)
  } finally {
    uploading.value = false
  }
}

watch(open, (v) => {
  if (v) {
    selectedIds.value = []
    keyword.value = ''
    activeSource.value = 'all'
    brokenIds.value = new Set()
    uploadError.value = ''
    dragging.value = false
    load(props.mode === 'object' ? { pageSize: 100, source: 'object' } : { pageSize: 100 })
  }
})

const close = () => (open.value = false)
useAccessibleDialog(open, dialogRef, close)
const confirm = () => {
  const chosen = assets.value.filter((a) => selectedIds.value.includes(a.id))
  if (!chosen.length) return
  if (props.multiple) emit('select-many', chosen)
  else emit('select', chosen[0])
  close()
}
</script>

<style scoped lang="scss">
.picker {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  @include flex(center, center);
  padding: 1.5rem;
}
// 對齊 Figma overlay_picker / dialog_picker（node 125:570、125:571）
.picker__modal {
  width: 45rem;
  max-width: 100%;
  max-height: 88vh;
  background: $white;
  border-radius: 12px;
  box-shadow: 0 0.75rem 2rem rgba(26, 28, 51, 0.3);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.picker__head {
  @include flex(space-between, center);
}
.picker__title {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.5rem;
  color: $blue-dark-500;
}
.picker__sub {
  font-size: 0.75rem;
  line-height: 1rem;
  color: $gray-100;
  margin-top: 0.125rem;
}
.picker__close {
  @include flex(center, center);
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
  color: $gray-400;

  svg {
    width: 1.25rem;
    height: 1.25rem;
  }
}
.picker__toolbar {
  @include flex(space-between, center, 0.5rem);
}
.picker__search {
  flex: 1;
  width: auto;
}
.sources {
  @include flex(flex-start, center, 0.5rem);
}
.chip {
  padding: 0.1875rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  color: #606692;
  border: 1px solid $gray;
  background: $white;
  white-space: nowrap;
  // 設計稿只畫了 default 狀態，選中樣式為實作補上
  &.isActive {
    background: $blue-dark-500;
    color: $white;
    border-color: $blue-dark-500;
  }
}
// dlg_grid：4 欄（159 寬）、列距 16、欄距 12
.picker__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  column-gap: 0.75rem;
  row-gap: 1rem;
  overflow-y: auto;
}
.pick {
  @include flex(flex-start, stretch, 0.375rem);
  flex-direction: column;
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0;

  &__thumb {
    @include flex(center, center);
    position: relative;
    // thumb 159 x 104
    aspect-ratio: 159 / 104;
    background: #eef1f7;
    border: 2px solid transparent;
    border-radius: 8px;
    color: $babyBlue;

    svg {
      width: 2.75rem;
      height: 2.75rem;
    }
  }
  &__thumbImage {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
  }
  &.isSelected &__thumb {
    border-color: $blue-dark-500;
  }
  // sel_check 22 x 22，未選取時也在，只是空的白圈
  &__check {
    position: absolute;
    top: 0.375rem;
    right: 0.375rem;
    width: 1.375rem;
    height: 1.375rem;
    border: 1px solid $gray;
    border-radius: 11px;
    opacity: 0.9;
    background: $white;
    @include flex(center, center);

    // 選中：改由 IconCheck 自己畫出完整徽章（深藍底圈 #2e3567 + 內圈綠色圓 #54c14f + 白色勾），
    // wrapper 不再疊自己的底色；border-width 歸零（而非只轉透明）是因為專案是 border-box，
    // 保留 1px 透明邊框會讓 svg 的 100% 尺寸少算掉 2px，圖示會比設計稿的 22px 徽章小一圈
    &.isOn {
      border-width: 0;
      opacity: 1;
      background: transparent;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
  }
  &__meta {
    @include flex(space-between, center, 0.375rem);
  }
  &__name {
    flex: 1;
    min-width: 0;
    font-size: 0.75rem;
    line-height: 1rem;
    color: $dark-blue-gray;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
.tag {
  flex-shrink: 0;
  padding: 0.1875rem 0.75rem;
  border-radius: 16px;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  background: #f6eac1;
  color: $dark-blue-gray;
}
// 上傳失敗訊息（role="alert"）
.picker__error {
  font-size: 0.8125rem;
  line-height: 1.54;
  color: $danger;
}
// 上傳卡片：沿用 .pick__thumb 的尺寸與底色，改成虛線框＋加號＋文字
.pick--upload {
  cursor: pointer;

  .pick__thumb {
    flex-direction: column;
    gap: 0.375rem;
    border: 2px dashed $gray-100;
    color: #606692;

    svg {
      width: 1.375rem;
      height: 1.375rem;
    }
  }
  &:hover .pick__thumb,
  &.isDragging .pick__thumb {
    border-color: $blue-dark-500;
    color: $blue-dark-500;
  }
  &[aria-disabled='true'] {
    cursor: progress;
  }
}
.pick__uploadText {
  font-size: 0.8125rem;
  line-height: 1.54;
}
.pick__spinner {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.picker__foot {
  @include flex(space-between, center);
}
.picker__count {
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: #606692;
}
.picker__actions {
  @include flex(flex-start, center, 0.75rem);
}
</style>
