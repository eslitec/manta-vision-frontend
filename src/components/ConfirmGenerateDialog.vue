<template lang="pug">
Teleport(to="body")
  .confirm(v-if="open" @click.self="cancel")
    .confirm__modal(ref="dialogRef" role="alertdialog" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="messageId" tabindex="-1")
      .confirm__head
        span.confirm__icon
          IconAlertTriangleFilled
        h3.confirm__title(:id="titleId") {{ resolvedTitle }}
      p.confirm__msg(:id="messageId") {{ resolvedMessage }}
      .confirm__rows
        .confirm__row(v-if="modelLabel")
          span.confirm__label {{ t('confirmGenerate.model') }}
          span.confirm__value {{ modelLabel }}
        .confirm__row.confirm__row--card
          span.confirm__label {{ t('confirmGenerate.cost') }}
          strong.confirm__cost
            IconFeedBottleSmall
            span {{ cost }} {{ t('confirmGenerate.feedUnit') }}
        .confirm__row.confirm__row--sub
          span.confirm__label {{ t('confirmGenerate.balance') }}
          span.confirm__balance
            IconFeedBottleSmall
            span {{ balance.toLocaleString() }} {{ t('confirmGenerate.feedUnit') }}
      .confirm__actions
        AppButton(data-dialog-initial-focus variant="outline" @click="cancel") {{ t('confirmGenerate.cancel') }}
        AppButton(variant="primary" @click="confirm")
          IconAddObject
          span {{ resolvedConfirmText }}
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeedStore } from '@/stores/feed'
import AppButton from '@/components/AppButton.vue'
import { IconFeedBottleSmall, IconAddObject, IconAlertTriangleFilled } from '@/components/icons'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'

const props = defineProps<{
  cost: number
  modelLabel?: string
  title?: string
  message?: string
  confirmText?: string
}>()
const emit = defineEmits<{
  (e: 'confirm'): void
}>()
const open = defineModel<boolean>('open', { required: true })
const dialogRef = ref<HTMLElement | null>(null)
const titleId = `confirm-generate-title-${crypto.randomUUID()}`
const messageId = `confirm-generate-message-${crypto.randomUUID()}`

const { balance } = storeToRefs(useFeedStore())
const { t } = useI18n()

const resolvedTitle = computed(() => props.title ?? t('confirmGenerate.title'))
const resolvedMessage = computed(() => props.message ?? t('confirmGenerate.message'))
const resolvedConfirmText = computed(() => props.confirmText ?? t('confirmGenerate.confirm'))

const cancel = () => (open.value = false)
useAccessibleDialog(open, dialogRef, cancel)
const confirm = () => {
  emit('confirm')
  open.value = false
}
</script>

<style scoped lang="scss">
.confirm {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(23, 30, 82, 0.45);
  @include flex(center, center);
  padding: 1.5rem;

  &__modal {
    width: 26.25rem;
    max-width: 100%;
    background: $white;
    border-radius: 10px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem; // dialog_head／內文／rows 群組／actions 之間統一 16px（對齊 Figma flex-col gap-16）
  }

  &__head {
    @include flex(flex-start, center, 0.75rem);
  }

  &__icon {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 8px;
    flex-shrink: 0;
    background: $blue-light;
    color: $blue-dark-500;
    font-size: 1.5rem;
    @include flex(center, center);
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: $dark-blue-gray;
  }

  &__msg {
    color: #606692;
    font-size: 1rem;
    line-height: 1.375;
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: 1rem; // model_row／cost_row／bal_row 之間統一 16px；設計稿沒有分隔線，移除原本的 border-top
  }

  &__row {
    @include flex(space-between, center);
    font-size: 0.875rem;
    line-height: 1.4286;

    &--card {
      padding: 0.75rem;
      border-radius: 8px;
      background: $blue-light;
    }
  }

  &__label {
    color: $gray-100;
  }

  &__value {
    color: #606692;
  }

  &__cost,
  &__balance {
    @include flex(flex-start, center, 0.25rem);
  }

  &__cost {
    color: $orange;
    font-weight: 700;
    font-size: 1rem;
  }

  &__balance {
    color: #606692;
    font-weight: 400;
  }

  &__actions {
    @include flex(flex-end, center, 0.75rem);
  }
}
// cost_row（本次消耗）的標籤色比 model_row／bal_row 深，對齊設計稿 #383c4b
.confirm__row--card .confirm__label {
  color: $dark-blue-gray;
}
</style>
