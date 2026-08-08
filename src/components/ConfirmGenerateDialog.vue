<template lang="pug">
Teleport(to="body")
  .confirm(v-if="open" @click.self="cancel")
    .confirm__modal
      .confirm__head
        span.confirm__icon
          i.ti.ti-alert-triangle
        h3.confirm__title {{ title }}
      p.confirm__msg {{ message }}
      .confirm__rows
        .confirm__row(v-if="modelLabel")
          span 使用模型
          span {{ modelLabel }}
        .confirm__row.confirm__row--card
          span 本次消耗
          strong.confirm__cost
            IconFeedBottleSmall
            span {{ cost }} 顆飼料
        .confirm__row.confirm__row--sub
          span 剩餘飼料
          span.confirm__balance
            IconFeedBottleSmall
            span {{ balance.toLocaleString() }} 顆飼料
      .confirm__actions
        DialogButton(@click="cancel") 取消
        DialogButton(variant="primary" @click="confirm")
          i.ti.ti-plus
          span {{ confirmText }}
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useFeedStore } from '@/stores/feed'
import DialogButton from '@/components/DialogButton.vue'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'

withDefaults(
  defineProps<{
    open: boolean
    cost: number
    modelLabel?: string
    title?: string
    message?: string
    confirmText?: string
  }>(),
  {
    title: '確認生成影片',
    message:
      '影片會在背景生成，約需 1–2 分鐘。你可以離開此頁面，完成後會在右上角「任務」通知你，影片自動存入圖庫›影片。',
    confirmText: '確認生成',
  },
)
const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'confirm'): void
}>()

const { balance } = storeToRefs(useFeedStore())

const cancel = () => emit('update:open', false)
const confirm = () => {
  emit('confirm')
  emit('update:open', false)
}
</script>

<style scoped lang="scss">
.confirm {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(23, 30, 82, 0.45);
  @include flex(center, center); padding: 24px;
}
.confirm__modal {
  width: 420px; max-width: 100%; background: $white; border-radius: 16px; padding: 24px;
}
.confirm__head { @include flex(flex-start, center, 10px); margin-bottom: 12px; }
.confirm__icon {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  background: #FAEEDA; color: #BA7517; font-size: 18px; @include flex(center, center);
}
.confirm__title { font-size: 17px; font-weight: 700; color: $blue-dark-300; }
.confirm__msg { font-size: 14px; color: $gray-400; line-height: 1.6; margin-bottom: 18px; }

.confirm__rows { border-top: 1px solid $lightGray; padding-top: 14px; margin-bottom: 18px; }
.confirm__row {
  @include flex(space-between, center);
  font-size: 15px; color: $blue-dark-300; padding: 4px 0;
  &--sub { font-size: 13px; color: $gray-100; }
  &--card { background: $blue-light; border-radius: 8px; padding: 10px 12px; margin: 6px 0; }
}
.confirm__cost, .confirm__balance { @include flex(flex-start, center, 6px); color: $orange; font-weight: 700; }
.confirm__balance { color: inherit; font-weight: inherit; }

.confirm__actions { @include flex(flex-end, center, 10px); }
</style>
