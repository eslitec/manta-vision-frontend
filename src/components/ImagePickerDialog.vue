<template lang="pug">
Teleport(to="body")
  .picker(v-if="open" @click.self="close")
    .picker__modal
      header.picker__head
        div
          .picker__title {{ title }}
          .picker__sub 調閱機器人「日安選物」的素材與生成產物
        button.picker__close(@click="close" aria-label="關閉")
          i.ti.ti-x
      .picker__toolbar
        .search
          i.ti.ti-search.search__icon
          input.search__input(v-model="keyword" type="text" placeholder="搜尋素材名稱或標籤")
        .sources
          button.chip(v-for="s in sources" :key="s.label" :class="{ 'is-active': activeSource === s.value }" @click="activeSource = s.value") {{ s.label }}
      .picker__grid
        button.pick(v-for="a in filtered" :key="a.id" :class="{ 'is-selected': selectedIds.includes(a.id) }" @click="toggle(a.id)")
          .pick__thumb
            span.pick__check(v-if="selectedIds.includes(a.id)")
              i.ti.ti-check
            i.ti(:class="a.type === 'video' ? 'ti-player-play' : 'ti-photo'")
          .pick__meta
            span.pick__name {{ a.name }}
            span.tag(:class="'tag--' + a.tag") {{ a.source }}
      footer.picker__foot
        span.picker__count 已選 {{ count }} 項
        .picker__actions
          DialogButton(@click="close") 取消
          DialogButton(variant="primary" :disabled="!count" @click="confirm") {{ multiple ? `加入所選（${count}）` : '選擇這張' }}
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAssets } from '@/composables/useAssets'
import DialogButton from '@/components/DialogButton.vue'
import type { Asset } from '@/types/asset'

const props = withDefaults(defineProps<{ open: boolean; title?: string; multiple?: boolean }>(), {
  title: '從圖庫選擇',
  multiple: false,
})
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'select', asset: Asset): void
  (e: 'select-many', assets: Asset[]): void
}>()

const { assets, load } = useAssets()

const keyword = ref('')
const sources = [
  { label: '全部', value: 'all' },
  { label: '上傳', value: 'upload' },
  { label: 'AI 生成', value: 'ai' },
]
const activeSource = ref('all')
const selectedIds = ref<string[]>([])

const count = computed(() => selectedIds.value.length)

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

watch(
  () => props.open,
  (v) => {
    if (v) {
      selectedIds.value = []
      keyword.value = ''
      activeSource.value = 'all'
      load()
    }
  },
)

const close = () => emit('update:open', false)
const confirm = () => {
  const chosen = assets.value.filter((a) => selectedIds.value.includes(a.id))
  if (!chosen.length) return
  if (props.multiple) emit('select-many', chosen)
  else emit('select', chosen[0])
  close()
}
</script>

<style scoped lang="scss">
.picker { position: fixed; inset: 0; z-index: 1000; background: rgba(23, 30, 82, 0.45); @include flex(center, center); padding: 24px; }
.picker__modal { width: 720px; max-width: 100%; max-height: 88vh; background: $white; border-radius: 16px; padding: 22px 24px; display: flex; flex-direction: column; }
.picker__head { @include flex(space-between, flex-start); margin-bottom: 16px; }
.picker__title { font-size: 18px; font-weight: 700; color: $blue-dark-300; }
.picker__sub { font-size: 12px; color: $gray-100; margin-top: 2px; }
.picker__close { color: $gray-400; font-size: 20px; }
.picker__toolbar { @include flex(space-between, center, 12px); margin-bottom: 16px; }
.search { position: relative; flex: 1;
  &__icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: $gray-100; font-size: 16px; }
  &__input { width: 100%; height: 38px; border: 1px solid $gray; border-radius: 999px; padding: 0 14px 0 34px; font-size: 14px; color: $blue-dark-300; outline: none; &:focus { border-color: $blue; } } }
.sources { @include flex(flex-start, center, 6px); }
.chip { padding: 5px 12px; border-radius: 999px; font-size: 13px; color: $gray-400; border: 1px solid $gray; background: $white; white-space: nowrap;
  &.is-active { background: $blue-dark-300; color: $white; border-color: $blue-dark-300; } }
.picker__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; overflow-y: auto; padding: 2px; }
.pick { text-align: left; background: $white; border-radius: 10px; padding: 4px; border: 2px solid transparent;
  &.is-selected { border-color: $blue; }
  &__thumb { @include flex(center, center); position: relative; aspect-ratio: 1 / 1; background: $blue-light; border-radius: 8px; color: $babyBlue; font-size: 26px; margin-bottom: 6px; }
  &__check { position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; border-radius: 50%; background: $blue; color: $white; font-size: 14px; @include flex(center, center); }
  &__meta { padding: 0 2px 4px; }
  &__name { display: block; font-size: 13px; color: $blue-dark-300; margin-bottom: 4px; } }
.tag { font-size: 11px; padding: 2px 7px; border-radius: 6px; font-weight: 500;
  &--upload { background: #E6F1FB; color: #185FA5; } &--object { background: #EEEDFE; color: #534AB7; }
  &--ai { background: #FAEEDA; color: #854F0B; } &--edit { background: #EAF3DE; color: #3B6D11; } &--video { background: #FBEAF0; color: #993556; } }
.picker__foot { @include flex(space-between, center); margin-top: 18px; border-top: 1px solid $lightGray; padding-top: 16px; }
.picker__count { font-size: 13px; color: $gray-400; }
.picker__actions { @include flex(flex-start, center, 10px); }
</style>
