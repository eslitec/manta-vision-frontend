<template lang="pug">
Teleport(to="body")
  .picker(v-if="open" @click.self="close")
    .picker__modal(ref="dialogRef" role="dialog" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="descriptionId" tabindex="-1")
      header.picker__head
        div
          .picker__title(:id="titleId") {{ resolvedTitle }}
          .picker__sub(:id="descriptionId") {{ t('imagePicker.subtitle') }}
        button.picker__close(data-dialog-initial-focus @click="close" :aria-label="t('common.close')")
          IconClose
      .picker__toolbar
        AppSearchbar.picker__search(v-model="keyword" :label="t('imagePicker.searchPlaceholder')" :placeholder="t('imagePicker.searchPlaceholder')")
        .sources
          button.chip(v-for="s in sources" :key="s.label" :aria-pressed="activeSource === s.value" :class="{ 'isActive': activeSource === s.value }" @click="activeSource = s.value") {{ s.label }}
      .picker__grid
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
          AppButton(variant="primary" :disabled="!count" @click="confirm") {{ multiple ? t('imagePicker.addSelected', { count }) : t('imagePicker.selectOne') }}
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAssets } from '@/composables/useAssets'
import AppButton from '@/components/AppButton.vue'
import AppSearchbar from '@/components/AppSearchbar.vue'
import { IconCheck, IconClose, IconImagePlaceholder, IconMovie } from '@/components/icons'
import type { Asset } from '@/types/asset'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'

const props = withDefaults(defineProps<{ title?: string; multiple?: boolean }>(), {
  title: undefined,
  multiple: false,
})
const emit = defineEmits<{
  (e: 'select', asset: Asset): void
  (e: 'select-many', assets: Asset[]): void
}>()
const open = defineModel<boolean>('open', { required: true })
const dialogRef = ref<HTMLElement | null>(null)
const titleId = `image-picker-title-${crypto.randomUUID()}`
const descriptionId = `image-picker-description-${crypto.randomUUID()}`

const { assets, load } = useAssets()
const { t } = useI18n()

const keyword = ref('')
const resolvedTitle = computed(() => props.title ?? t('imagePicker.defaultTitle'))
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
const filtered = computed(() =>
  assets.value.filter((a) => {
    const bySource = activeSource.value === 'all' || a.source === activeSource.value
    const byKeyword = !keyword.value || a.name.includes(keyword.value)
    return bySource && byKeyword
  }),
)

function toggle(id: string) {
  if (props.multiple) {
    const i = selectedIds.value.indexOf(id)
    if (i >= 0) selectedIds.value.splice(i, 1)
    else selectedIds.value.push(id)
  } else {
    selectedIds.value = [id] // 單選：只保留一張
  }
}

watch(open, (v) => {
  if (v) {
    selectedIds.value = []
    keyword.value = ''
    activeSource.value = 'all'
    brokenIds.value = new Set()
    load({ pageSize: 100 })
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

    // 選中：深藍底 + 白色勾（設計稿 sel_check 的 ic_ok 是白色打勾圖示，不是綠色圓形打勾）
    &.isOn {
      border-color: $blue-dark-500;
      opacity: 1;
      background: $blue-dark-500;
      color: $white;
    }

    svg {
      display: block;
      width: 0.8125rem;
      height: 0.8125rem;
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
