<template lang="pug">
Teleport(to="body")
  .picker(v-if="open" @click.self="close")
    .picker__modal
      header.picker__head
        div
          .picker__title {{ resolvedTitle }}
          .picker__sub {{ t('imagePicker.subtitle') }}
        button.picker__close(@click="close" :aria-label="t('common.close')")
          i.ti.ti-x
      .picker__toolbar
        .search
          i.ti.ti-search.search__icon
          input.search__input(v-model="keyword" type="text" :placeholder="t('imagePicker.searchPlaceholder')")
        .sources
          button.chip(v-for="s in sources" :key="s.label" :class="{ 'isActive': activeSource === s.value }" @click="activeSource = s.value") {{ s.label }}
      .picker__grid
        button.pick(v-for="a in filtered" :key="a.id" :class="{ 'isSelected': selectedIds.includes(a.id) }" @click="toggle(a.id)")
          .pick__thumb
            span.pick__check(v-if="selectedIds.includes(a.id)")
              i.ti.ti-check
            i.ti(:class="a.type === 'video' ? 'ti-player-play' : 'ti-photo'")
          .pick__meta
            span.pick__name {{ a.name }}
            span.tag {{ sourceLabel(a.tag) }}
      footer.picker__foot
        span.picker__count {{ t('imagePicker.selectedCount', { count }) }}
        .picker__actions
          DialogButton(@click="close") {{ t('common.cancel') }}
          DialogButton(variant="primary" :disabled="!count" @click="confirm") {{ multiple ? t('imagePicker.addSelected', { count }) : t('imagePicker.selectOne') }}
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAssets } from '@/composables/useAssets'
import DialogButton from '@/components/DialogButton.vue'
import type { Asset } from '@/types/asset'

const props = withDefaults(defineProps<{ title?: string; multiple?: boolean }>(), {
  title: undefined,
  multiple: false,
})
const emit = defineEmits<{
  (e: 'select', asset: Asset): void
  (e: 'select-many', assets: Asset[]): void
}>()
const open = defineModel<boolean>('open', { required: true })

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
.search {
  position: relative;
  flex: 1;
  &__icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: $gray-100;
    font-size: 1rem;
  }
  &__input {
    width: 100%;
    height: 2.375rem;
    border: 1px solid $gray;
    border-radius: 999px;
    padding: 0 0.875rem 0 2.125rem;
    font-size: 0.875rem;
    color: $blue-dark-300;
    outline: none;
    &:focus {
      border-color: $blue;
    }
  }
}
.sources {
  @include flex(flex-start, center, 0.375rem);
}
.chip {
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
    background: $blue;
    color: $white;
    font-size: 0.875rem;
    @include flex(center, center);
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
