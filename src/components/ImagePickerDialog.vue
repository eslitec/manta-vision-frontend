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
            span.pick__check(v-if="selectedIds.includes(a.id)")
              IconCheckCircle
            IconMovie(v-if="a.type === 'video'")
            IconImagePlaceholder(v-else)
          .pick__meta
            span.pick__name {{ a.name }}
            span.tag {{ sourceLabel(a.tag) }}
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
import IconCheckCircle from '@/components/icons/IconCheckCircle.vue'
import IconClose from '@/components/icons/IconClose.vue'
import IconImagePlaceholder from '@/components/icons/IconImagePlaceholder.vue'
import IconMovie from '@/components/icons/IconMovie.vue'
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
const sources = computed(() => [
  { label: t('sources.all'), value: 'all' },
  { label: t('sources.upload'), value: 'upload' },
  { label: t('sources.ai'), value: 'ai' },
  { label: t('sources.edit'), value: 'edit' },
])
const activeSource = ref('all')
const selectedIds = ref<string[]>([])

const count = computed(() => selectedIds.value.length)
const sourceLabel = (source: string) => t(`sources.${source}`)

const filtered = computed(() =>
  assets.value.filter((a) => {
    const bySource = activeSource.value === 'all' || a.tag === activeSource.value
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
    load()
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
  background: rgba(23, 30, 82, 0.45);
  @include flex(center, center);
  padding: 1.5rem;
}
.picker__modal {
  width: 45rem;
  max-width: 100%;
  max-height: 88vh;
  background: $white;
  border-radius: 16px;
  padding: 1.375rem 1.5rem;
  display: flex;
  flex-direction: column;
}
.picker__head {
  @include flex(space-between, flex-start);
  margin-bottom: 1rem;
}
.picker__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: $blue-dark-300;
}
.picker__sub {
  font-size: 0.75rem;
  color: $gray-100;
  margin-top: 0.125rem;
}
.picker__close {
  color: $gray-400;
  font-size: 1.25rem;
}
.picker__toolbar {
  @include flex(space-between, center, 0.75rem);
  margin-bottom: 1rem;
}
.picker__search {
  flex: 1;
  width: auto;
}
.sources {
  @include flex(flex-start, center, 0.375rem);
}
.chip {
  min-width: 1.5rem;
  min-height: 1.5rem;
  padding: 0.3125rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  color: $gray-400;
  border: 1px solid $gray;
  background: $white;
  white-space: nowrap;
  &.isActive {
    background: $blue-dark-300;
    color: $white;
    border-color: $blue-dark-300;
  }
}
.picker__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.875rem;
  overflow-y: auto;
  padding: 0.125rem;
}
.pick {
  text-align: left;
  background: $white;
  border-radius: 10px;
  padding: 0.25rem;
  border: 2px solid transparent;
  &.isSelected {
    border-color: $blue;
  }
  &__thumb {
    @include flex(center, center);
    position: relative;
    aspect-ratio: 1 / 1;
    background: $blue-light;
    border-radius: 8px;
    color: $babyBlue;
    font-size: 1.625rem;
    margin-bottom: 0.375rem;
  }
  &__check {
    position: absolute;
    top: 0.375rem;
    right: 0.375rem;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: 50%;
    background: $blue-dark-500;
    @include flex(center, center);

    svg {
      display: block;
      width: 1.25rem;
      height: 1.25rem;
    }
  }
  &__meta {
    @include flex(space-between, center, 0.375rem);
    padding: 0 0.125rem 0.25rem;
  }
  &__name {
    flex: 1;
    min-width: 0;
    font-size: 0.8125rem;
    color: $blue-dark-300;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
.tag {
  flex-shrink: 0;
  font-size: 0.6875rem;
  padding: 0.125rem 0.4375rem;
  border-radius: 6px;
  font-weight: 500;
  background: #faeeda;
  color: #854f0b;
}
.picker__foot {
  @include flex(space-between, center);
  margin-top: 1.125rem;
  border-top: 1px solid $lightGray;
  padding-top: 1rem;
}
.picker__count {
  font-size: 0.8125rem;
  color: $gray-400;
}
.picker__actions {
  @include flex(flex-start, center, 0.625rem);
}
</style>
