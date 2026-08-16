<template lang="pug">
Teleport(to="body")
  .saveAssetDialog(v-if="open" @click.self="cancel")
    form.saveAssetDialog__modal(
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descriptionId"
      tabindex="-1"
      @submit.prevent="submit"
    )
      .saveAssetDialog__head
        h3(:id="titleId") {{ t('editor.saveDialog.title') }}
        button.saveAssetDialog__close(type="button" :disabled="loading" :aria-label="t('common.close')" @click="cancel") ×
      p(:id="descriptionId") {{ t('editor.saveDialog.description') }}
      label.saveAssetDialog__field
        span {{ t('editor.saveDialog.nameLabel') }}
        input(
          v-model="name"
          data-dialog-initial-focus
          type="text"
          maxlength="80"
          autocomplete="off"
          :placeholder="t('editor.saveDialog.namePlaceholder')"
          :aria-invalid="showNameError || undefined"
          :aria-describedby="showNameError ? errorId : undefined"
          @input="showNameError = false"
        )
        small(v-if="showNameError" :id="errorId" role="alert") {{ t('editor.saveDialog.nameRequired') }}
      .saveAssetDialog__actions
        AppButton(variant="outline" :disabled="loading" @click="cancel") {{ t('common.cancel') }}
        AppButton(native-type="submit" :loading="loading" :disabled="!name.trim()") {{ t('editor.saveDialog.confirm') }}
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'

const props = defineProps<{ defaultName: string; loading?: boolean }>()
const emit = defineEmits<{ (event: 'save', name: string): void }>()
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()
const dialogRef = ref<HTMLElement | null>(null)
const name = ref('')
const showNameError = ref(false)
const titleId = `save-asset-title-${crypto.randomUUID()}`
const descriptionId = `save-asset-description-${crypto.randomUUID()}`
const errorId = `save-asset-error-${crypto.randomUUID()}`

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = props.defaultName
  showNameError.value = false
})

const cancel = () => {
  if (!props.loading) open.value = false
}
const submit = () => {
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    showNameError.value = true
    return
  }
  emit('save', trimmedName)
}

useAccessibleDialog(open, dialogRef, cancel)
</script>

<style scoped lang="scss">
.saveAssetDialog {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(23, 30, 82, 0.45);

  &__modal {
    width: 28rem;
    max-width: 100%;
    padding: 1.5rem;
    border-radius: 16px;
    background: $white;
    box-shadow: $boxShadowDark;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.5rem;

    h3 {
      color: $blue-dark-300;
      font-size: 1.0625rem;
      font-weight: 700;
    }
  }

  &__close {
    display: flex;
    width: 2.75rem;
    height: 2.75rem;
    flex: 0 0 2.75rem;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: $gray-400;
    font-size: 1.5rem;
  }

  &__modal > p {
    margin-bottom: 1.125rem;
    color: $gray-400;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    color: $blue-dark-300;
    font-size: 0.875rem;
    font-weight: 500;

    input {
      width: 100%;
      height: 2.75rem;
      padding: 0.625rem 0.875rem;
      border: 1px solid $lightGray;
      border-radius: 8px;
      color: $blue-dark-300;
      font: inherit;

      &:focus-visible {
        border-color: $blue-dark-500;
        outline: 2px solid rgba(46, 53, 103, 0.2);
        outline-offset: 2px;
      }

      &[aria-invalid='true'] {
        border-color: $red;
      }
    }

    small {
      color: $red;
      font-size: 0.75rem;
      font-weight: 400;
    }
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.625rem;
    margin-top: 1.5rem;
  }
}

@include below($bp-sm) {
  .saveAssetDialog {
    align-items: flex-end;
    padding: 1rem;

    &__modal {
      padding: 1.25rem;
    }

    &__actions .appButton {
      flex: 1;
    }
  }
}
</style>
