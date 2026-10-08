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
        span.saveAssetDialog__grow
        button.saveAssetDialog__close(
          type="button"
          :disabled="loading"
          :aria-label="t('common.close')"
          @click="cancel"
        ) ×

      .saveAssetDialog__preview
        .saveAssetDialog__thumb
          img.saveAssetDialog__thumbImg(v-if="previewSrc" :src="previewSrc" alt="")
          IconImagePlaceholder(v-else)
        .saveAssetDialog__previewText
          p.saveAssetDialog__applied(:id="descriptionId") {{ appliedSummaryText }}
          p.saveAssetDialog__meta(v-if="metaLine") {{ metaLine }}
          p.saveAssetDialog__kept
            svg.saveAssetDialog__keptIcon(width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true")
              path(d="M13.5 4.5 6.75 11.5 3 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
            span {{ t('editor.saveDialog.originalKept', { name: originalNameText }) }}

      label.saveAssetDialog__field
        .saveAssetDialog__fieldHead
          span.saveAssetDialog__fieldLabel {{ t('editor.saveDialog.nameLabel') }}
          span.saveAssetDialog__grow
          span.saveAssetDialog__counter {{ nameLength }} / {{ maxNameLength }}
        input.saveAssetDialog__input(
          v-model="name"
          data-dialog-initial-focus
          type="text"
          :maxlength="maxNameLength"
          autocomplete="off"
          :placeholder="t('editor.saveDialog.namePlaceholder')"
          :aria-invalid="showNameError || undefined"
          :aria-describedby="showNameError ? errorId : undefined"
          @input="showNameError = false"
        )
        small.saveAssetDialog__error(v-if="showNameError" :id="errorId" role="alert") {{ t('editor.saveDialog.nameRequired') }}

      .saveAssetDialog__field
        label.saveAssetDialog__fieldLabel(:for="folderId") {{ t('editor.saveDialog.folderHeading') }}
        .saveAssetDialog__folder
          IconImagePlaceholder.saveAssetDialog__folderIcon
          select.saveAssetDialog__folderSelect(
            :id="folderId"
            v-model="folder"
            :disabled="loading"
          )
            option(v-for="option in folderOptions" :key="option" :value="option") {{ option }}
          IconChevronDown.saveAssetDialog__chevron
        small.saveAssetDialog__hint {{ t('editor.saveDialog.folderHint') }}

      .saveAssetDialog__options
        AppCheckbox(v-model="keepLayers")
          span.saveAssetDialog__optionText {{ t('editor.saveDialog.keepLayers') }}
        AppCheckbox(v-model="alsoDownload")
          span.saveAssetDialog__optionText {{ t('editor.saveDialog.alsoDownload') }}

      .saveAssetDialog__actions
        span.saveAssetDialog__nocost {{ t('editor.saveDialog.noCost') }}
        span.saveAssetDialog__grow
        AppButton(variant="outline" :disabled="loading" @click="cancel") {{ t('common.cancel') }}
        AppButton(native-type="submit" :loading="loading" :disabled="!name.trim()") {{ t('editor.saveDialog.confirm') }}
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import AppCheckbox from '@/components/AppCheckbox.vue'
import { IconImagePlaceholder, IconChevronDown } from '@/components/icons'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'
import { UNFILED_FOLDER } from '@/types/asset'

const props = defineProps<{
  defaultName: string
  loading?: boolean
  folders?: string[] // 「存放位置」可選的使用者資料夾清單
  defaultFolder?: string // 開啟時預設選取的資料夾
  originalName?: string // 「原圖保留」文案要顯示的原始素材名稱
  appliedSummary?: string // 「已套用：…」的編輯摘要
  metaLine?: string // 尺寸／格式／檔案大小，例如 1024 × 768 px ・ PNG ・ 約 1.4 MB
  previewSrc?: string // 縮圖來源；沒有時顯示佔位圖示
}>()
const emit = defineEmits<{
  (event: 'save', payload: { name: string; folder: string; keepLayers: boolean; alsoDownload: boolean }): void
}>()
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()

const maxNameLength = 60
const dialogRef = ref<HTMLElement | null>(null)
const name = ref('')
const folder = ref('')
const keepLayers = ref(true)
const alsoDownload = ref(false)
const showNameError = ref(false)
const uid = crypto.randomUUID()
const titleId = `save-asset-title-${uid}`
const descriptionId = `save-asset-description-${uid}`
const errorId = `save-asset-error-${uid}`
const folderId = `save-asset-folder-${uid}`

const nameLength = computed(() => name.value.length)
const folderOptions = computed(() => (props.folders?.length ? props.folders : [UNFILED_FOLDER]))
const appliedSummaryText = computed(() => props.appliedSummary ?? t('editor.saveDialog.appliedDefault'))
const originalNameText = computed(() => props.originalName ?? props.defaultName)

const resolveDefaultFolder = () => {
  const options = folderOptions.value
  if (props.defaultFolder && options.includes(props.defaultFolder)) return props.defaultFolder
  if (options.includes(UNFILED_FOLDER)) return UNFILED_FOLDER
  return options[0]
}

watch(open, (isOpen) => {
  if (!isOpen) return
  name.value = props.defaultName
  folder.value = resolveDefaultFolder()
  keepLayers.value = true
  alsoDownload.value = false
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
  emit('save', {
    name: trimmedName,
    folder: folder.value,
    keepLayers: keepLayers.value,
    alsoDownload: alsoDownload.value,
  })
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

  &__grow {
    flex: 1 0 0;
  }

  &__modal {
    display: flex;
    width: 32.5rem;
    max-width: 100%;
    flex-direction: column;
    gap: 0.875rem;
    padding: 1.25rem 1.5rem;
    border-radius: 14px;
    background: $white;
    box-shadow: 0 12px 16px rgba(0, 0, 0, 0.2);
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 0.625rem;

    h3 {
      color: $blue-dark-500;
      font-size: 1.0625rem;
      font-weight: 700;
    }
  }

  &__close {
    display: flex;
    width: 1.5rem;
    height: 1.5rem;
    flex: 0 0 1.5rem;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: $blue-dark-500;
    font-size: 1.375rem;
    line-height: 1;
    cursor: pointer;

    &:disabled {
      cursor: default;
      opacity: 0.5;
    }
  }

  &__preview {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 0.875rem;
    border-radius: 10px;
    background: $blue-light;
  }

  &__thumb {
    display: flex;
    width: 4.5rem;
    height: 4.5rem;
    flex: 0 0 4.5rem;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid $gray;
    border-radius: 8px;
    background: #eef1f7;
    color: $gray-100;

    :deep(svg) {
      width: 2.75rem;
      height: 2.75rem;
    }
  }

  &__thumbImg {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__previewText {
    display: flex;
    min-width: 0;
    flex: 1 0 0;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__applied {
    color: $blue-dark-500;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.4;
  }

  &__meta {
    color: #606692;
    font-size: 0.6875rem;
    line-height: 1.4;
  }

  &__kept {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: $green;
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1.4;
  }

  &__keptIcon {
    flex: 0 0 auto;
    color: $green;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  &__fieldHead {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__fieldLabel {
    color: $blue-dark-500;
    font-size: 0.75rem;
    font-weight: 500;
  }

  &__counter {
    color: $gray-100;
    font-size: 0.75rem;
  }

  &__input {
    width: 100%;
    height: 2.25rem;
    padding: 0.5rem 0.875rem;
    border: 1px solid $gray;
    border-radius: 18px;
    color: $blue-dark-500;
    font: inherit;
    font-size: 0.875rem;

    &::placeholder {
      color: $gray-100;
    }

    &:focus-visible {
      border-color: $blue-dark-500;
      outline: 2px solid rgba(46, 53, 103, 0.2);
      outline-offset: 1px;
    }

    &[aria-invalid='true'] {
      border-color: $red;
    }
  }

  &__error {
    color: $red;
    font-size: 0.75rem;
  }

  &__folder {
    position: relative;
    display: flex;
    align-items: center;
    border: 1px solid $gray;
    border-radius: 8px;

    &:focus-within {
      border-color: $blue-dark-500;
    }
  }

  &__folderIcon {
    position: absolute;
    left: 0.75rem;
    width: 1rem;
    height: 1rem;
    color: $blue-dark-500;
    pointer-events: none;

    :deep(svg) {
      width: 1rem;
      height: 1rem;
    }
  }

  &__folderSelect {
    width: 100%;
    height: 2.375rem;
    padding: 0 2.25rem 0 2.25rem;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: $blue-dark-500;
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;

    &:focus-visible {
      outline: 2px solid rgba(46, 53, 103, 0.2);
      outline-offset: 1px;
    }

    &:disabled {
      cursor: default;
      opacity: 0.6;
    }
  }

  &__chevron {
    position: absolute;
    right: 0.75rem;
    width: 1.125rem;
    height: 1.125rem;
    color: $blue-dark-500;
    pointer-events: none;

    :deep(svg) {
      width: 1.125rem;
      height: 1.125rem;
    }
  }

  &__hint {
    color: $gray-100;
    font-size: 0.625rem;
    line-height: 1.5;
  }

  &__options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__optionText {
    color: $blue-dark-500;
    font-size: 0.75rem;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  &__nocost {
    color: $gray-100;
    font-size: 0.6875rem;
  }
}

@include below($bp-sm) {
  .saveAssetDialog {
    align-items: flex-end;
    padding: 1rem;

    &__modal {
      width: 100%;
      padding: 1.25rem;
    }

    &__actions {
      flex-wrap: wrap;
    }
  }
}
</style>
