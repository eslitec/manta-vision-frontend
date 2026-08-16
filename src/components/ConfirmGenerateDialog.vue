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
          span {{ t('confirmGenerate.model') }}
          span {{ modelLabel }}
        .confirm__row.confirm__row--card
          span {{ t('confirmGenerate.cost') }}
          strong.confirm__cost
            IconFeedBottleSmall
            span {{ cost }} {{ t('confirmGenerate.feedUnit') }}
        .confirm__row.confirm__row--sub
          span {{ t('confirmGenerate.balance') }}
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
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import IconAddObject from '@/components/icons/IconAddObject.vue'
import IconAlertTriangleFilled from '@/components/icons/IconAlertTriangleFilled.vue'
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
    border-radius: 16px;
    padding: 1.5rem;
  }

  &__head {
    @include flex(flex-start, center, 0.625rem);
    margin-bottom: 0.75rem;
  }

  &__icon {
    width: 2.125rem;
    height: 2.125rem;
    border-radius: 50%;
    flex-shrink: 0;
    background: #faeeda;
    color: #ba7517;
    font-size: 1.125rem;
    @include flex(center, center);
  }

  &__title {
    font-size: 1.0625rem;
    font-weight: 700;
    color: $blue-dark-300;
  }

  &__msg {
    margin-bottom: 1.125rem;
    color: $gray-400;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  &__rows {
    margin-bottom: 1.125rem;
    padding-top: 0.875rem;
    border-top: 1px solid $lightGray;
  }

  &__row {
    @include flex(space-between, center);
    padding: 0.25rem 0;
    color: $blue-dark-300;
    font-size: 0.9375rem;

    &--sub {
      color: $gray-100;
      font-size: 0.8125rem;
    }

    &--card {
      margin: 0.375rem 0;
      padding: 0.625rem 0.75rem;
      border-radius: 8px;
      background: $blue-light;
    }
  }

  &__cost,
  &__balance {
    @include flex(flex-start, center, 0.375rem);
    color: $orange;
    font-weight: 700;
  }

  &__balance {
    color: inherit;
    font-weight: inherit;
  }

  &__actions {
    @include flex(flex-end, center, 0.625rem);
  }
}
</style>
