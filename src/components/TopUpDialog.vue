<template lang="pug">
Teleport(to="body")
  .topUp(v-if="open" @click.self="cancel")
    .topUp__modal(ref="dialogRef" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1")
      template(v-if="!success")
        .topUp__head
          span.topUp__icon
            IconFeedBottleSmall
          h3.topUp__title(:id="titleId") {{ t('topUpDialog.title') }}
        .topUp__packages
          button.topUp__package(
            v-for="pkg in PACKAGES"
            :key="pkg.id"
            type="button"
            :class="{ isSelected: selectedPackageId === pkg.id }"
            :aria-pressed="selectedPackageId === pkg.id"
            :aria-label="t('topUpDialog.packageAriaLabel', { count: pkg.amount })"
            @click="selectedPackageId = pkg.id"
          )
            IconFeedBottleSmall.topUp__packageIcon
            span.topUp__packageAmount {{ t('units.feed', { count: pkg.amount }) }}
        p.topUp__error(v-if="errorMessage" role="alert") {{ errorMessage }}
        .topUp__actions
          AppButton(data-dialog-initial-focus variant="outline" @click="cancel") {{ t('common.cancel') }}
          AppButton(variant="primary" :disabled="!selectedPackageId" :loading="submitting" @click="confirm") {{ t('topUpDialog.confirm') }}
      template(v-else)
        .topUp__head
          span.topUp__icon.topUp__icon--success
            IconCheckCircle
          h3.topUp__title(:id="titleId") {{ t('topUpDialog.successTitle') }}
        p.topUp__successMsg {{ t('topUpDialog.successMessage', { count: toppedUpAmount }) }}
        .topUp__actions
          AppButton(data-dialog-initial-focus variant="primary" @click="finish") {{ t('topUpDialog.done') }}
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeedStore } from '@/stores/feed'
import { api } from '@/api'
import AppButton from '@/components/AppButton.vue'
import { IconFeedBottleSmall, IconCheckCircle } from '@/components/icons'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'
import type { FeedPackageId } from '@/types/api'

const open = defineModel<boolean>('open', { required: true })
const dialogRef = ref<HTMLElement | null>(null)
const titleId = `topup-dialog-title-${crypto.randomUUID()}`

const { t } = useI18n()
const feed = useFeedStore()

// 固定 3 個套餐（500／1500／3000 顆），寫死在前端；見 design.md 決策 4
const PACKAGES: { id: FeedPackageId; amount: number }[] = [
  { id: 'pkg-500', amount: 500 },
  { id: 'pkg-1500', amount: 1500 },
  { id: 'pkg-3000', amount: 3000 },
]

const selectedPackageId = ref<FeedPackageId | null>(null)
const submitting = ref(false)
const errorMessage = ref('')
const success = ref(false)
const toppedUpAmount = ref(0)

function reset() {
  selectedPackageId.value = null
  submitting.value = false
  errorMessage.value = ''
  success.value = false
  toppedUpAmount.value = 0
}

const cancel = () => {
  open.value = false
}
useAccessibleDialog(open, dialogRef, cancel)

// 不論從哪個路徑關閉（Escape／點背景／完成按鈕），下次開啟都要回到乾淨的初始狀態
watch(open, (isOpen) => {
  if (!isOpen) reset()
})

async function confirm() {
  const pkg = PACKAGES.find((p) => p.id === selectedPackageId.value)
  if (!pkg) return

  // 真後端模式（mock-only 方法不存在）：顯示不支援訊息，不呼叫、不拋出執行期錯誤
  if (!api.topUpFeed) {
    errorMessage.value = t('topUpDialog.unsupported')
    return
  }

  errorMessage.value = ''
  submitting.value = true
  try {
    const { balance } = await api.topUpFeed(pkg.id)
    feed.applyTopUp(balance)
    toppedUpAmount.value = pkg.amount
    success.value = true
  } catch {
    // mock 環境理論上不會失敗，但仍防禦網路層級例外：保持在選取狀態讓使用者可以重試
    errorMessage.value = t('topUpDialog.errorMessage')
  } finally {
    submitting.value = false
  }
}

function finish() {
  open.value = false
}
</script>

<style scoped lang="scss">
.topUp {
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
    gap: 1.25rem;
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

    &--success {
      background: rgba(52, 199, 89, 0.12);
      color: #34c759;
    }
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: $dark-blue-gray;
  }

  &__packages {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  &__package {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    padding: 1rem 0.5rem;
    border: 1px solid $gray;
    border-radius: 8px;
    background: $white;
    cursor: pointer;
    transition:
      border-color 0.15s,
      background-color 0.15s;

    &Icon {
      font-size: 1.5rem;
      color: $orange;
    }

    &Amount {
      font-size: 0.875rem;
      font-weight: 700;
      color: $dark-blue-gray;
    }

    &.isSelected {
      border: 1.5px solid $blue-dark-500;
      background: $blue-light;
    }

    &:focus-visible {
      outline: 2px solid $yellow;
      outline-offset: 2px;
    }
  }

  &__error {
    color: #ff6148;
    font-size: 0.8125rem;
  }

  &__successMsg {
    color: #606692;
    font-size: 1rem;
    line-height: 1.375;
  }

  &__actions {
    @include flex(flex-end, center, 0.75rem);
  }
}
</style>
