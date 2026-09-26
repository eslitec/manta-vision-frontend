<template lang="pug">
.workspace(:class="{ 'isRetouch': mode === 'retouch' }")
  template(v-if="mode === 'retouch'")
    button.retouchToggle(
      type="button"
      :aria-expanded="retouchSetupOpen"
      aria-controls="retouch-setup"
      @click="retouchSetupOpen = !retouchSetupOpen"
    )
      span {{ t('editor.retouch.setup') }}
      IconChevronDown(:class="{ isUp: retouchSetupOpen }")
    aside#retouch-setup.retouchPanel(:class="{ 'isMobileOpen': retouchSetupOpen }")
      h3 {{ t('editor.retouch.steps.source') }}
      .sourceThumb
        img.editorSourceImg(v-if="selectedAssetUrl" :src="selectedAssetUrl" :alt="selectedAssetName")
        IconImagePlaceholder(v-else)
      .sourceActions
        AppButton(variant="outline" @click="openEditorPicker") {{ t('common.selectFromLibrary') }}
        span.uploadTip {{ t('common.orDragUpload') }}
      h3 {{ t('editor.retouch.steps.method') }}
      .methodRow
        button.method(type="button" :class="{ active: retouchMethod === 'quick' }" :aria-pressed="retouchMethod === 'quick'" @click="setRetouchMethod('quick')") #[strong {{ t('editor.retouch.quick') }}] #[small {{ t('editor.retouch.quickHint') }}]
        button.method(type="button" :class="{ active: retouchMethod === 'command' }" :aria-pressed="retouchMethod === 'command'" @click="setRetouchMethod('command')") #[strong {{ t('editor.retouch.command') }}] #[small {{ t('editor.retouch.commandHint') }}]
      template(v-if="retouchMethod === 'quick'")
        .optionSectionHead
          h3 {{ t('editor.retouch.steps.options') }}
        #retouch-options.optionList
          label.option(v-for="o in retouchOptionsForMethod" :key="o.key" :class="{ isSelected: o.on }")
            AppCheckbox(v-model="o.on" :label="t(`editor.retouch.options.${o.key}.name`)")
            span.option__copy #[strong {{ t(`editor.retouch.options.${o.key}.name`) }}] #[small {{ t(`editor.retouch.options.${o.key}.hint`) }}]
            span.option__cost(:class="{ free: o.free }")
              IconFeedBottleSmall(v-if="!o.free")
              b {{ o.free ? t('editor.free') : t('editor.feedShort', { count: o.cost }) }}
      template(v-else)
        h3 {{ t('editor.retouch.steps.requiredInstruction') }}
        small.optionalOptionsHint {{ t('editor.retouch.presetsHint') }}
        .presetRow
          button.presetChip(
            v-for="preset in commandPresets"
            :key="preset.key"
            type="button"
            @click="applyCommandPreset(preset.label)"
          ) {{ preset.label }}
        textarea(
          v-model="retouchInstruction"
          maxlength="200"
          required
          :aria-label="t('editor.retouch.steps.requiredInstruction')"
          :placeholder="t('editor.retouch.placeholder')"
        )
        small.charCounter {{ retouchInstruction.length }} / 200
      p.editorError(v-if="retouchError" role="alert") {{ retouchError }}
      footer.panelAction
        span {{ t('common.estimatedCost') }} #[b {{ t('units.feed', { count: estimatedRetouchCost }) }}]
        AppButton(:disabled="!canStartRetouch || retouching" :loading="retouching" @click="startRetouch") {{ t('editor.retouch.start') }}
    section.resultPanel
      header.resultHead #[strong {{ t('editor.retouch.result') }}] #[span {{ retouchAppliedLabel }}]
      .compare
        .compare__item
          span {{ t('editor.original') }}
          .compare__thumb
            img.editorSourceImg(v-if="selectedAssetUrl" :src="selectedAssetUrl" :alt="selectedAssetName")
            IconImagePlaceholder(v-else)
          small {{ t('editor.uploadedDate') }}
        .compare__item
          span.active {{ t('editor.afterRetouch') }}
          .compare__thumb(:class="{ isLoading: retouching }")
            .retouchProgress(v-if="retouching")
              IconSpinnerRing.retouchProgress__spinner
              strong {{ t('editor.retouch.inProgress') }}
              small {{ retouchStepLabel }}
              .retouchProgress__bar
                .retouchProgress__fill(:style="{ width: `${retouchProgressPercent}%` }")
              small.retouchProgress__eta {{ retouchTimeRemainingLabel }}
            IconImagePlaceholder(v-else)
          small(v-if="!retouching") {{ t('editor.consumed', { count: lastRetouchCost }) }}
      footer.resultActions(v-if="hasSelectedAsset")
        span {{ t('editor.saveHint') }}
        AppButton(variant="outline" @click="retouchSetupOpen = true") {{ t('editor.retouch.again') }}
        AppButton(variant="outline") {{ t('common.download') }}
        AppButton(:disabled="Boolean(savedAssetId)" @click="openSaveDialog") {{ savedAssetId ? t('common.saved') : t('editor.saveAsNew') }}
        span.visuallyHidden(v-if="savedAssetId" role="status" aria-live="polite") {{ t('common.saved') }}
        span.visuallyHidden(v-if="saveError" role="alert") {{ t('editor.saveFailed') }}

  template(v-else)
    aside.tools
      button.tool(
        :class="{active: tool==='remove'}"
        :aria-pressed="tool === 'remove'"
        :disabled="applyingTool === 'remove' || !hasSelectedAsset"
        @click="selectRemoveTool"
      )
        IconAiSparkle
        span {{ t('editor.tools.remove') }}
        small.tool__cost(v-if="removeToolCost")
          IconFeedBottleSmall
          | {{ removeToolCost }}
      button.tool.tool--object(:class="{active: tool==='object'}" :aria-pressed="tool === 'object'" :disabled="!hasSelectedAsset" @click="tool = 'object'") #[IconAddObject] #[span {{ t('editor.tools.object') }}]
      button.tool(:class="{active: tool==='text'}" :aria-pressed="tool === 'text'" :disabled="!hasSelectedAsset" @click="insertTextLayer") #[IconTextDocument] #[span {{ t('editor.tools.text') }}]
      button.tool(:class="{active: tool==='crop'}" :aria-pressed="tool === 'crop'" :disabled="!hasSelectedAsset" @click="tool='crop'") #[IconEdit] #[span {{ t('editor.tools.crop') }}]
    section.canvasPanel
      header.canvasHead
        strong(v-if="hasSelectedAsset") #[IconImagePlaceholder] {{ selectedAssetName }}
        strong(v-else) {{ t('editor.emptyState.title') }}
        span(v-if="hasSelectedAsset") {{ t('editor.status', { status: tool === 'crop' ? t('editor.cropping') : t('editor.edited') }) }}
        AppButton.canvasHead__libraryButton(variant="outline" @click="openEditorPicker") {{ tool === 'object' ? t('editor.replaceBaseImage') : t('common.selectFromLibrary') }}
        .canvasActions(v-if="hasSelectedAsset")
          button.canvasActions__zoom(type="button" :disabled="!canZoomOut" :aria-label="t('editor.zoomOut')" @click="zoomOut")
            IconBack
          button.canvasActions__zoom(type="button" :disabled="!canZoomIn" :aria-label="t('editor.zoomIn')" @click="zoomIn")
            IconNext
          output.canvasActions__value(aria-live="polite") {{ zoomPercent }}%
        AppButton(v-if="hasSelectedAsset" :disabled="Boolean(savedAssetId)" @click="openSaveDialog") {{ savedAssetId ? t('common.saved') : t('editor.saveAsNew') }}
        span.visuallyHidden(v-if="savedAssetId" role="status" aria-live="polite") {{ t('common.saved') }}
        span.visuallyHidden(v-if="saveError" role="alert") {{ t('editor.saveFailed') }}
      .canvas(@pointerdown="deselectObjectLayer")
        .artboard(ref="artboardRef" :class="{cropping: tool==='crop'}" :style="artboardZoomStyle")
          .canvasEmpty(v-if="!originalLayer")
            IconImagePlaceholder
            span.canvasEmpty__hint {{ t('editor.emptyState.canvasHint') }}
          template(v-else-if="originalLayer.visible")
            img.editorSourceImg(v-if="selectedAssetUrl" :src="selectedAssetUrl" :alt="selectedAssetName" @load="onSourceImgLoad")
            IconImagePlaceholder(v-else)
          .textObject(
            v-for="textLayer in textLayers"
            v-show="textLayer.visible"
            :key="textLayer.key"
            :class="{ isDragging: draggingTextKey === textLayer.key, isEditing: editingTextKey === textLayer.key, isCropPreview: tool === 'crop' }"
            :style="textLayerStyle(textLayer)"
            @pointerdown.stop="startTextDrag($event, textLayer)"
          )
            span.textObject__content(
              :ref="(el) => setTextObjectRef(textLayer.key, el)"
              role="textbox"
              :tabindex="tool === 'crop' ? -1 : 0"
              :aria-label="t('editor.textContent')"
              :aria-multiline="false"
              :contenteditable="tool !== 'crop' && editingTextKey === textLayer.key ? 'true' : 'false'"
              @dblclick.stop="beginTextEdit(textLayer.key)"
              @keydown="handleTextKeydown($event, textLayer.key)"
              @blur="finishTextEdit(textLayer.key)"
            ) {{ textLayer.content }}
            button.textResizeHandle.textResizeHandle--nw(
              v-if="tool !== 'crop' && editingTextKey !== textLayer.key"
              type="button"
              :aria-label="t('editor.resizeText')"
              @pointerdown.stop="startTextResize($event, textLayer, 'nw')"
              @keydown="handleTextResizeKeydown($event, textLayer)"
            )
            button.textResizeHandle.textResizeHandle--ne(
              v-if="tool !== 'crop' && editingTextKey !== textLayer.key"
              type="button"
              :aria-label="t('editor.resizeText')"
              @pointerdown.stop="startTextResize($event, textLayer, 'ne')"
              @keydown="handleTextResizeKeydown($event, textLayer)"
            )
            button.textResizeHandle.textResizeHandle--sw(
              v-if="tool !== 'crop' && editingTextKey !== textLayer.key"
              type="button"
              :aria-label="t('editor.resizeText')"
              @pointerdown.stop="startTextResize($event, textLayer, 'sw')"
              @keydown="handleTextResizeKeydown($event, textLayer)"
            )
            button.textResizeHandle.textResizeHandle--se(
              v-if="tool !== 'crop' && editingTextKey !== textLayer.key"
              type="button"
              :aria-label="t('editor.resizeText')"
              @pointerdown.stop="startTextResize($event, textLayer, 'se')"
              @keydown="handleTextResizeKeydown($event, textLayer)"
            )
          .objectObject(
            v-for="objectLayer in objectLayers"
            v-show="objectLayer.visible"
            :key="objectLayer.key"
            :class="{ isSelected: tool !== 'crop' && selectedLayerKey === objectLayer.key, isDragging: objectLayer.dragging, isCropPreview: tool === 'crop', hasImage: Boolean(objectLayer.url) }"
            :style="objectLayerStyle(objectLayer)"
            :tabindex="tool === 'crop' ? -1 : 0"
            :aria-label="objectLayer.label"
            @pointerdown.stop="startObjectDrag($event, objectLayer)"
            @focus="selectLayer(objectLayer.key)"
          )
            img.objectObject__img(v-if="objectLayer.url" :src="objectLayer.url" :alt="objectLayer.label" draggable="false")
            IconImagePlaceholder(v-else)
            template(v-if="tool !== 'crop' && selectedLayerKey === objectLayer.key")
              button.objectResizeHandle.objectResizeHandle--nw(type="button" :aria-label="t('editor.resizeObject')" @pointerdown.stop="startObjectResize($event, objectLayer, 'nw')" @keydown="handleObjectResizeKeydown($event, objectLayer)")
              button.objectResizeHandle.objectResizeHandle--ne(type="button" :aria-label="t('editor.resizeObject')" @pointerdown.stop="startObjectResize($event, objectLayer, 'ne')" @keydown="handleObjectResizeKeydown($event, objectLayer)")
              button.objectResizeHandle.objectResizeHandle--sw(type="button" :aria-label="t('editor.resizeObject')" @pointerdown.stop="startObjectResize($event, objectLayer, 'sw')" @keydown="handleObjectResizeKeydown($event, objectLayer)")
              button.objectResizeHandle.objectResizeHandle--se(type="button" :aria-label="t('editor.resizeObject')" @pointerdown.stop="startObjectResize($event, objectLayer, 'se')" @keydown="handleObjectResizeKeydown($event, objectLayer)")
          .objectSelection(
            v-if="tool === 'object'"
            :style="objectSelectionStyle"
            :class="{ isDragging: objectSelectionDragging }"
            @pointerdown.stop="startObjectSelectionDrag"
          )
            .objectSelection__handle.objectSelection__handle--nw
            .objectSelection__handle.objectSelection__handle--ne
            .objectSelection__handle.objectSelection__handle--sw
            .objectSelection__handle.objectSelection__handle--se
            span.objectSelection__tip {{ t('editor.addObject.selectionTip') }}
          .cropFrame(v-if="tool === 'crop'" :style="cropFrameStyle" :class="{ isDragging: cropDragging }" @pointerdown="startCropMove")
            .cropAppliedBadge(v-if="ratio !== 'custom' && cropOutputDimensions") {{ t('editor.cropApplied.badge', { ratio: cropRatioLabel, width: cropOutputDimensions.width, height: cropOutputDimensions.height }) }}
            button.cropHandle.cropHandle--nw(type="button" :aria-label="t('editor.resizeCrop')" @pointerdown.stop="startCropResize($event, 'nw')")
            button.cropHandle.cropHandle--ne(type="button" :aria-label="t('editor.resizeCrop')" @pointerdown.stop="startCropResize($event, 'ne')")
            button.cropHandle.cropHandle--sw(type="button" :aria-label="t('editor.resizeCrop')" @pointerdown.stop="startCropResize($event, 'sw')")
            button.cropHandle.cropHandle--se(type="button" :aria-label="t('editor.resizeCrop')" @pointerdown.stop="startCropResize($event, 'se')")
          .removeOverlay(v-if="applyingTool === 'remove' && !removeOverlayDismissed")
            IconSpinnerRing.removeOverlay__spinner
            strong {{ t('editor.tools.removeInProgress') }}
            small {{ t('editor.tools.removeInProgressHint') }}
            AppButton(variant="outline" @click="removeOverlayDismissed = true") {{ t('common.cancel') }}
        .cropAppliedActions(v-if="tool === 'crop'")
          AppButton(variant="outline" size="compact" @click="undoAppliedCrop") {{ t('editor.cropApplied.undo') }}
          AppButton(variant="outline" size="compact" @click="recropCustom") {{ t('editor.cropApplied.recrop') }}
          AppButton(size="compact" :disabled="Boolean(savedAssetId)" @click="openSaveDialog") {{ savedAssetId ? t('common.saved') : t('editor.saveAsNew') }}
        p(v-if="canvasHint" :style="canvasHintStyle") {{ canvasHint }}
      footer.canvasFoot {{ t('editor.nonDestructive') }}
    aside.layers(v-if="tool!=='crop'")
      h3 {{ t('editor.layers') }} #[button(:aria-label="t('editor.duplicateLayer')" :disabled="!canDuplicateSelectedLayer" @click="duplicateSelectedLayer"): IconAddObject]
      .layer(
        v-for="layer in layers"
        :key="layer.key"
        :class="{ isSelected: selectedLayerKey === layer.key, isDragging: draggedLayerKey === layer.key, isDropTarget: dropTargetKey === layer.key }"
        @dragover.prevent="setLayerDropTarget(layer.key)"
        @dragleave="clearLayerDropTarget($event, layer.key)"
        @drop="dropLayerBefore(layer.key)"
      )
        AppCheckbox(v-model="layer.visible" :label="layerLabel(layer)" :disabled="layer.locked")
        button.layer__select(
          type="button"
          :aria-label="t('editor.selectLayer', { name: layerLabel(layer) })"
          :aria-pressed="selectedLayerKey === layer.key"
          @click="selectLayer(layer.key)"
        )
          IconImagePlaceholder.layer__thumbnail
          span.layer__copy
            span {{ layerLabel(layer) }}
            small {{ layerDescription(layer) }}
        button.layer__lock(
          v-if="layer.type === 'original'"
          type="button"
          :aria-label="t(layer.locked ? 'editor.unlockOriginal' : 'editor.lockOriginal')"
          :aria-pressed="layer.locked"
          @click="toggleOriginalLock"
        ) {{ t(layer.locked ? 'editor.locked' : 'editor.unlocked') }}
        button.layer__sortButton(
          v-else
          type="button"
          draggable="true"
          :aria-label="t('editor.reorderLayer', { name: layerLabel(layer) })"
          @dragstart="startLayerDrag($event, layer.key)"
          @dragend="finishLayerDrag"
          @keydown="handleLayerOrderKeydown($event, layer.key)"
        )
          IconLayerSort.layer__sort
      .properties(v-if="selectedTextLayer")
        h3 {{ t('editor.textProperties') }}
        input.properties__text(v-model="selectedTextLayer.content" :aria-label="t('editor.textContent')")
        .fontRow
          .fontSelect(ref="fontSelectEl")
            button.fontSelect__trigger(
              type="button"
              :aria-label="t('editor.fontFamily')"
              aria-haspopup="listbox"
              :aria-expanded="fontMenuOpen"
              :class="{ isOpen: fontMenuOpen }"
              @click="fontMenuOpen = !fontMenuOpen"
            )
              span.fontSelect__value {{ t(`editor.fontOptions.${selectedTextLayer.fontId}`) }}
              IconChevronDown(:class="{ isUp: fontMenuOpen }")
            .fontMenu(v-if="fontMenuOpen")
              .fontMenu__scroll
                .fontMenu__list(role="listbox" :aria-label="t('editor.fontFamily')")
                  template(v-for="group in fontGroups" :key="group.id")
                    .fontMenu__group {{ t(`editor.fontGroups.${group.id}`) }}
                    button.fontMenu__item(
                      v-for="option in group.options"
                      :key="option.id"
                      type="button"
                      role="option"
                      :aria-selected="option.id === selectedTextLayer.fontId"
                      :class="{ isSelected: option.id === selectedTextLayer.fontId }"
                      @click="selectFont(option.id)"
                    )
                      span.fontMenu__col
                        span.fontMenu__name {{ t(`editor.fontOptions.${option.id}`) }}
                        span.fontMenu__desc {{ t(`editor.fontDescriptions.${option.id}`) }}
                      IconCheckCircle.fontMenu__check(v-if="option.id === selectedTextLayer.fontId")
                span.fontMenu__fade(aria-hidden="true")
              .fontMenu__note
                span.fontMenu__noteMain {{ t('editor.fontNoteLicense') }}
                span.fontMenu__noteSub {{ t('editor.fontNoteUpload') }}
          label.colorPicker(:aria-label="t('editor.textColor')" :style="{ '--selected-color': selectedTextLayer.color }")
            input(v-model="selectedTextLayer.color" type="color" :title="t('editor.textColor')")
        small.properties__settings {{ t('editor.textSettings') }}
      .objectGenerator(v-if="tool === 'object'")
        h3 {{ t('editor.addObject.title') }}
        AppButton(variant="outline" @click="openObjectPicker") {{ selectedObjectLayer ? t('editor.addObject.replaceImage') : t('editor.addObject.pickFromLibrary') }}
        textarea.objectGenerator__desc(
          v-model="objectDescription"
          maxlength="200"
          :aria-label="t('editor.addObject.descriptionLabel')"
          :placeholder="t('editor.addObject.descriptionPlaceholder')"
        )
        small.charCounter {{ objectDescription.length }} / 200
        .presetRow
          button.presetChip(v-for="preset in objectPresets" :key="preset.key" type="button" @click="applyObjectPreset(preset.label)") {{ preset.label }}
        small.objectGenerator__hint {{ t('editor.addObject.hint') }}
        AppButton(
          :disabled="!objectDescription.trim() || generatingObject"
          :loading="generatingObject"
          @click="generateObjectFromDescription"
        ) {{ generatingObject ? t('editor.addObject.generating') : t('editor.addObject.generate') }}
      p.editorError(v-if="toolError && tool === 'remove'" role="alert") {{ toolError }}
      .aiCost(v-if="usedTools.length")
        h3 {{ t('editor.aiToolsUsed') }}
        p.aiCost__row(v-for="item in usedTools" :key="item.tool")
          span {{ t(`editor.tools.${item.tool}`) }}
          span.aiCost__amount.aiCost__amount--item
            button.aiCost__feedBtn(type="button" :aria-label="t('feedBadge.topup')" @click="topUpOpen = true")
              IconFeedBottleSmall
            b {{ t('units.feed', { count: item.cost }) }}
        p.aiCost__row.aiCost__row--total
          strong {{ t('editor.total') }}
          span.aiCost__amount.aiCost__amount--total
            button.aiCost__feedBtn(type="button" :aria-label="t('feedBadge.topup')" @click="topUpOpen = true")
              IconFeedBottleSmall
            b {{ t('units.feed', { count: usedToolsTotal }) }}
        small.aiCost__note {{ t('editor.costNote') }}
    aside.cropPanel(v-else)
      h3 {{ t('editor.tools.crop') }}
        button.cropReset(type="button" :aria-label="t('editor.resetCrop')" @click="resetCrop")
          IconRefresh
      .ratioRow
        button(v-for="option in ratioOptions" :key="option.id" :class="{active:ratio===option.id}" :aria-pressed="ratio === option.id" @click="applyCropRatio(option.id)") {{ option.label }}
      button.custom(:class="{ active: ratio === 'custom' }" :aria-pressed="ratio === 'custom'" @click="ratio = 'custom'") {{ t('editor.custom') }}
      p(v-if="cropOutputDimensions") {{ t(ratio === 'custom' ? 'editor.dimensionsDynamic' : 'editor.croppedToDynamic', cropOutputDimensions) }}
      h3.channelPreviewsTitle {{ ratio === 'custom' ? t('editor.channelPreviews') : t('editor.channelPreviewsApplied') }}
      .previews
        .preview(v-for="p in previews" :key="p.name")
          .preview__thumb(:class="p.shape"): IconImagePlaceholder
          strong {{ p.name }}
          small(:class="{ warn: p.warn && ratio === 'custom', full: !p.warn }") {{ p.warn ? (ratio === 'custom' ? t('editor.croppedWarning') : t('editor.paddedNote')) : t('editor.fullyVisible') }}
      p.cropNote {{ t('editor.cropNote') }}
  ImagePickerDialog(v-model:open="editorPickerOpen" :mode="editorPickerMode" :title="editorPickerTitle" :subtitle="editorPickerSubtitle" @select="selectEditorAsset")
  SaveAssetDialog(
    v-model:open="saveDialogOpen"
    :default-name="suggestedAssetName"
    :original-name="selectedAssetName"
    :folders="folders"
    :loading="savingAsset"
    :error="saveErrorMessage"
    @save="saveAsNewAsset"
  )
  TopUpDialog(v-model:open="topUpOpen")
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import AppCheckbox from '@/components/AppCheckbox.vue'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import SaveAssetDialog from '@/components/SaveAssetDialog.vue'
import TopUpDialog from '@/components/TopUpDialog.vue'
import { useAssets } from '@/composables/useAssets'
import { usePointerDrag } from '@/composables/usePointerDrag'
import { usePercentDrag } from '@/composables/usePercentDrag'
import { useDismissableMenu } from '@/composables/useDismissableMenu'
import {
  IconAiSparkle,
  IconSpinnerRing,
  IconAddObject,
  IconImagePlaceholder,
  IconLayerSort,
  IconTextDocument,
  IconEdit,
  IconFeedBottleSmall,
  IconBack,
  IconCheckCircle,
  IconChevronDown,
  IconNext,
  IconRefresh,
} from '@/components/icons'
import { api } from '@/api'
import { useFeedStore } from '@/stores/feed'
import { isInsufficientFeed } from '@/utils/error'
import {
  containLayerInBox,
  coverRect,
  layerRectInSource,
  percentPointInSource,
  percentRectInSource,
} from '@/utils/composite'
import type { AppliedEditTool, EditorPricing, RetouchOptionKey } from '@/types/api'
import type { Asset } from '@/types/asset'
const props = defineProps<{ mode: string }>()
const { t } = useI18n()
const { saveEdited, folders, loadFolders, upload } = useAssets()
const feed = useFeedStore()

// 價目表一律問後端，前端不寫死金額（CLAUDE.md：前端不得硬寫範例數字）
const pricing = ref<EditorPricing | null>(null)
const removeToolCost = computed(() => pricing.value?.tools.remove ?? 0)
// 本次編輯已實際套用（並已扣款）的 AI 工具
const usedTools = ref<AppliedEditTool[]>([])
const usedToolsTotal = computed(() => usedTools.value.reduce((total, item) => total + item.cost, 0))
const topUpOpen = ref(false)
const applyingTool = ref('')
const toolError = ref('')
const retouching = ref(false)
const retouchError = ref('')
onMounted(async () => {
  if (!feed.loaded) feed.refresh()
  try {
    const next = await api.getEditorPricing()
    pricing.value = next
    retouchOptions.value.forEach((option) => {
      option.cost = next.retouchOptions[option.key] ?? 0
      option.free = option.cost === 0
    })
  } catch {
    // 價目表載不到時維持 0，畫面不顯示金額，但不擋住其他操作
  }
})
const tool = ref('remove'),
  ratio = ref('square')
// toolError 只跟「背景移除」的結果有關；離開背景移除工具時要清空，
// 避免上一次背景移除失敗的訊息殘留到物件／文字工具的畫面裡。
watch(tool, (value) => {
  if (value !== 'remove') toolError.value = ''
})
const editorPickerOpen = ref(false)
// 同一顆 picker 服務兩種用途：'asset'＝選擇要編輯的底圖（換掉整張圖）；'object'＝從圖庫挑一張圖
// 以物件圖層疊到畫布上（產品決策，推翻 d58051a「加入物件只走文字描述生成」）。物件模式列
// source=object（含內建物件），選到的圖只用 url 畫在畫布上、不送後端，所以內建素材在這裡可選。
const editorPickerMode = ref<'asset' | 'object'>('asset')
const editorPickerTitle = computed(() => {
  if (editorPickerMode.value !== 'object') return t('editor.sourcePickerTitle')
  return selectedObjectLayer.value ? t('editor.objectReplacePickerTitle') : t('editor.objectPickerTitle')
})
const editorPickerSubtitle = computed(() => {
  if (editorPickerMode.value !== 'object') return t('editor.sourcePickerSubtitle')
  return selectedObjectLayer.value ? t('editor.addObject.replacePickerSubtitle') : t('editor.addObject.pickerSubtitle')
})
// 尚未從圖庫選定素材時，名稱與網址都 SHALL 維持真的空字串，不能用示範資料頂替
// （decision 1，fix-editor-empty-state-before-asset-selected）——畫面上是否顯示
// 標題／圖層／工具列一律看這兩個 ref 是否有值，不是看它們「看起來像不像」有值。
const selectedAssetName = ref('')
const selectedAssetUrl = ref('')
// 「另存為新素材」要真的把裁切結果傳給後端（POST /upload 帶 sourceImageId）才能讓後端
// 標成 source=edit、非破壞性關聯回原圖，所以要記住目前選的是圖庫裡哪一張真實素材。
const selectedAssetId = ref('')
// 原圖真尺寸：先用後端量好的 width／height（Asset.width／height）當初值，主畫布 <img> 載入後一律
// 改用 naturalWidth／naturalHeight 覆蓋——瀏覽器的 naturalWidth 與 canvas 都套 EXIF 方向，後端
// Pillow 量的是未轉正的檔頭尺寸，手機直拍的 JPEG 兩者寬高會互換；buildOutputFile 用的是同一個
// 網址載入後的 natural 尺寸，顯示端跟著它才會等於實際輸出。兩者都沒有就是 null，
// 畫布徽章／提示與側欄尺寸文字一律不顯示，不再拿 Figma 稿上寫死的尺寸頂替。
const originalDimensions = ref<{ width: number; height: number } | null>(null)
const onSourceImgLoad = (event: Event) => {
  const { naturalWidth, naturalHeight } = event.target as HTMLImageElement
  if (naturalWidth && naturalHeight) originalDimensions.value = { width: naturalWidth, height: naturalHeight }
}
const savingAsset = ref(false)
const savedAssetId = ref('')
const saveError = ref(false)
// 使用者反饋：另存失敗時畫面完全沒有反應——SaveAssetDialog 之前沒有任何顯示失敗原因的地方，
// 只有一個 visuallyHidden 的 aria-live alert（螢幕報讀器聽得到，肉眼看不到）。這裡補一個
// 看得到的錯誤訊息，並依錯誤類型給比「儲存失敗」更具體的原因（例如原圖跨網域讀取被擋）。
const saveErrorMessage = ref('')
const saveDialogOpen = ref(false)
const openEditorPicker = () => {
  editorPickerMode.value = 'asset'
  editorPickerOpen.value = true
}
const openObjectPicker = () => {
  editorPickerMode.value = 'object'
  editorPickerOpen.value = true
}
// 空狀態判斷（decision 5，fix-editor-empty-state-before-asset-selected）：
// selectedAssetUrl 已經是既有、正確代表「有沒有真的選定素材」的 ref（見上方
// selectedAssetUrl 宣告處的說明），沿用它，不重複定義語意相同的旗標。
const hasSelectedAsset = computed(() => Boolean(selectedAssetUrl.value))
const selectEditorAsset = async (asset: Asset) => {
  if (editorPickerMode.value === 'object') {
    const url = asset.url ?? ''
    // 有選取的物件圖層（含 AI 生成的佔位）＝更換它的圖片：只換 url 與名稱，位置／縮放／順序／顯示／鎖定都保留
    // （「已儲存」狀態由 layersFingerprint 看 url 變化自動重置）
    const target = selectedObjectLayer.value
    if (target) {
      // 佔位換成圖片時把 scale 換算成同樣的畫面寬度，不讓圖層突然變大
      if (!target.url) target.scale *= PLACEHOLDER_WIDTH_PERCENT / OBJECT_LAYER_WIDTH_PERCENT
      target.url = url
      target.label = t('editor.objectLayerDynamic', { name: asset.name })
      return
    }
    addObjectLayer(asset.name, url, await imageAspect(url, asset))
    return
  }
  selectedAssetName.value = asset.name
  selectedAssetUrl.value = asset.url ?? ''
  selectedAssetId.value = asset.id
  originalDimensions.value = asset.width && asset.height ? { width: asset.width, height: asset.height } : null
  savedAssetId.value = ''
  // 換了來源素材＝重新開始，先前的扣款紀錄不再屬於這張圖
  usedTools.value = []
  toolError.value = ''
  // 原圖圖層只在真的選定素材後才存在（decision 2）：第一次選定時新增一筆，
  // 之後在同一次編輯工作階段重新選擇別的素材，就地更新這一筆而不是疊加新的。
  if (originalLayer.value) {
    originalLayer.value.visible = true
  } else {
    layers.push({ key: 'original', type: 'original', visible: true, locked: true })
  }
  selectedLayerKey.value = 'original'
}
const suggestedAssetName = computed(() => {
  if (props.mode === 'retouch') return `${selectedAssetName.value}_${t('editor.saveDialog.suffixes.retouch')}`
  const suffixKey = ['remove', 'object', 'text', 'crop'].includes(tool.value) ? tool.value : 'edited'
  return `${selectedAssetName.value}_${t(`editor.saveDialog.suffixes.${suffixKey}`)}`
})
const openSaveDialog = () => {
  if (savingAsset.value || savedAssetId.value) return
  saveError.value = false
  saveErrorMessage.value = ''
  loadFolders() // 讓「存放位置」下拉能列出使用者資料夾
  saveDialogOpen.value = true
}

type SaveAssetPayload = { name: string; folder: string; alsoDownload: boolean }

// MOCK：目前編輯器沒有真實影像位元組，因此以 canvas 產生一張佔位 PNG 供實際下載；
// 後端就緒後把這裡改成下載素材的真實 URL 即可。
function downloadEditedCopy(name: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 768
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#eef1f7'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#2e3567'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '600 44px "Noto Sans TC", "PingFang TC", sans-serif'
  ctx.fillText(name, canvas.width / 2, canvas.height / 2)
  canvas.toBlob((blob) => {
    if (!blob) return
    downloadBlob(blob, `${name}.png`)
  }, 'image/png')
}

// 「另存為新素材」真的把畫布合成成圖檔、上傳到真後端（POST /upload 帶 sourceImageId → 後端標
// source=edit、derivedFrom 指回原圖，非破壞；見 manta-vision-backend docs/api/v7.md §4）。之前只有
// 裁切走真上傳、其他工具走 mock editImage；現在物件圖層有真圖（url）、文字圖層有字型／顏色／位置，
// 三者都能合成，所以只要底圖有 url 就走真上傳。
//
// 座標換算（純函式在 utils/composite.ts）：畫布用 object-fit: cover 顯示原圖（4:3 置中裁切滿版），
// cropRect 與圖層的百分比都是相對「原圖被 cover 裁掉後實際顯示的那塊」，先算出那塊在原圖像素裡的
// 位置（coverRect），再把百分比換進去。輸出範圍：裁切工具下＝裁切框（先裁再疊，框外的圖層自然被
// 裁掉），其餘工具＝畫布顯示區（所見即所得）。buildOutputFile（實際輸出）與 cropOutputDimensions
// （畫面顯示的尺寸）共用 cropSourceRect，兩邊數字才會一致。
const ARTBOARD_ASPECT = 4 / 3
// 圖庫選來的物件圖層在畫布上的寬度＝底圖顯示寬的 40%（scale = 1 時），畫面（objectLayerStyle）與合成共用。
const OBJECT_LAYER_WIDTH_PERCENT = 40
// AI 生成佔位物件（沒有 url）在 scale = 1 時的畫面寬度百分比。
const PLACEHOLDER_WIDTH_PERCENT = 24
// 文字圖層在畫布上的字級（rem，見 textLayerStyle），合成時換算成原圖像素。
const TEXT_LAYER_BASE_REM = 1.25
function cropSourceRect(naturalWidth: number, naturalHeight: number) {
  return percentRectInSource(cropRect, coverRect({ width: naturalWidth, height: naturalHeight }, ARTBOARD_ASPECT))
}
// 不能用 new Image() + crossOrigin 直接載圖：畫布／選圖彈窗的 <img> 沒帶 crossorigin，已經用
// 不帶 Origin 的請求把圖放進快取，而 R2 對這種請求不回 CORS 標頭也不回 Vary: Origin，
// 之後的 CORS 請求會重用那份快取而失敗（實測）。比照 utils/download.ts：跳過快取重抓成 Blob，
// 再用同源的 blob: 網址餵給 Image，canvas 就不會被污染。底圖與物件圖層都走這條。
async function loadImageForCanvas(url: string): Promise<HTMLImageElement> {
  let blob: Blob
  try {
    const response = await fetch(url, { mode: 'cors', cache: 'reload' })
    if (!response.ok) throw new Error('CROP_IMAGE_LOAD_FAILED')
    blob = await response.blob()
  } catch {
    throw new Error('CROP_IMAGE_LOAD_FAILED')
  }
  const img = new Image()
  const blobUrl = URL.createObjectURL(blob)
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('CROP_IMAGE_LOAD_FAILED'))
      img.src = blobUrl
    })
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
  return img
}
// 字型策略：先請瀏覽器把該字型載進來（Google Fonts 走 display=swap 延遲載入，畫布上顯示過不代表
// 已經載完），載不到就退回系統 sans-serif 並在 console 留紀錄——寧可字型不對，也不要整張存不下來。
// load／check 要帶「要畫的文字」：Noto Sans／Serif TC 依 unicode-range 切成上百片，不帶文字只會
// 等到含空白字元的那一片，check 為真也不代表這幾個中文字的字形已載入。
// ponytail: load() 加 3 秒上限——實測（headless Chrome）Google Fonts 的可變字型多個字重共用同一個
// woff2，部分 FontFace 會卡在 status='loading' 永不結束（沒有任何網路請求在飛），fonts.load()
// 跟著永不 resolve，另存會轉圈到天荒地老；逾時就走下面的 check → 退回系統字型。
const FONT_LOAD_TIMEOUT_MS = 3000
async function resolveCanvasFont(family: string, weight: number, sizePx: number, text: string): Promise<string> {
  const spec = `${weight} ${sizePx}px ${family}`
  try {
    await Promise.race([
      document.fonts.load(spec, text),
      new Promise((resolve) => setTimeout(resolve, FONT_LOAD_TIMEOUT_MS)),
    ])
    if (document.fonts.check(spec, text)) return spec
  } catch {
    // 走下方 fallback
  }
  console.warn(`[editor] 字型「${family}」尚未載入，另存時改用系統字型`)
  return `${weight} ${sizePx}px sans-serif`
}
async function buildOutputFile(name: string): Promise<File> {
  const sourceUrl = selectedAssetUrl.value
  if (!sourceUrl) throw new Error('CROP_NO_SOURCE_IMAGE')
  const img = await loadImageForCanvas(sourceUrl)
  const cover = coverRect({ width: img.naturalWidth, height: img.naturalHeight }, ARTBOARD_ASPECT)
  const out = tool.value === 'crop' ? percentRectInSource(cropRect, cover) : cover
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(out.width))
  canvas.height = Math.max(1, Math.round(out.height))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-context-unavailable')
  // 原圖圖層解鎖後可被取消勾選（畫布只剩物件／文字）；跟其他圖層一樣隱藏就不畫，PNG 底保持透明。
  if (originalLayer.value?.visible !== false) {
    ctx.drawImage(img, out.x, out.y, out.width, out.height, 0, 0, canvas.width, canvas.height)
  }
  // 畫布上文字的字級是 rem（不隨畫布寬度縮放），換成原圖像素要拿「目前畫布顯示寬」當比例尺；
  // clientWidth 是 padding box（不含 .artboard 的 1px 邊框，圖層的百分比定位就是相對它），
  // 且不受 zoom 的 transform: scale 影響，量到的就是未縮放的版面寬。
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const artboardWidth = artboardRef.value?.clientWidth || 520
  const sourcePxPerArtboardPx = cover.width / artboardWidth
  // layers[0] 在最上層（見 layerZIndex），所以從尾端往前畫；原圖已當底圖畫過、隱藏的圖層不畫。
  for (const layer of [...layers].reverse()) {
    if (!layer.visible || layer.type === 'original') continue
    if (layer.type === 'object') {
      const objectLayer = layer as ObjectEditorLayer
      if (!objectLayer.url) continue // AI 生成（mock）的物件沒有真圖，畫不了
      const objectImg = await loadImageForCanvas(objectLayer.url)
      const rect = layerRectInSource(
        objectLayer,
        OBJECT_LAYER_WIDTH_PERCENT * objectLayer.scale,
        objectImg.naturalWidth / objectImg.naturalHeight,
        cover,
      )
      // ponytail: .objectObject 帶 1px 邊框，畫布上的 <img> 比這個矩形窄 2 畫布 px（520px 畫布約 0.4%），
      // 肉眼看不出；要歸零就把 .hasImage 的邊框改成 outline。
      ctx.drawImage(objectImg, rect.x - out.x, rect.y - out.y, rect.width, rect.height)
    } else {
      const textLayer = layer as TextEditorLayer
      const font = fontOptions.find((option) => option.id === textLayer.fontId) ?? fontOptions[0]
      const sizePx = TEXT_LAYER_BASE_REM * textLayer.scale * rootPx * sourcePxPerArtboardPx
      ctx.font = await resolveCanvasFont(font.family, font.weight, sizePx, textLayer.content)
      ctx.fillStyle = textLayer.color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const center = percentPointInSource(textLayer, cover)
      ctx.fillText(textLayer.content, center.x - out.x, center.y - out.y)
    }
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  // canvas 被跨網域圖片「污染」時，toBlob 不一定會拋錯，很多瀏覽器只是靜靜回 null——
  // 這裡當作另一種「跨網域讀取被擋」來分類，跟上面 img.onerror 給使用者一樣的錯誤訊息。
  if (!blob) throw new Error('CROP_EXPORT_BLOCKED')
  return new File([blob], `${name}.png`, { type: 'image/png' })
}
// 把捕捉到的錯誤換成使用者看得懂、且看得到（不再只有螢幕報讀器聽得到）的訊息。
function classifySaveError(err: unknown): string {
  const code = err instanceof Error ? err.message : ''
  if (code === 'CROP_NO_SOURCE_IMAGE') return t('editor.saveDialog.errorNoSourceImage')
  if (code === 'CROP_IMAGE_LOAD_FAILED' || code === 'CROP_EXPORT_BLOCKED')
    return t('editor.saveDialog.errorImageAccess')
  return t('editor.saveDialog.errorGeneric')
}
function downloadRealFile(file: File) {
  downloadBlob(file, file.name)
}
const saveAsNewAsset = async (payload: SaveAssetPayload) => {
  if (savingAsset.value || savedAssetId.value) return
  savingAsset.value = true
  saveError.value = false
  saveErrorMessage.value = ''
  try {
    // 底圖是圖庫裡的真實素材（有 url）就把畫布（底圖＋物件圖層＋文字圖層；裁切工具下先裁）合成
    // 一張 PNG 上傳到真後端；沒有真實圖檔來源的 demo 素材才維持原本 mock 的另存行為。
    // AI 修圖頁（mode === 'retouch'）例外：那一頁沒有畫布也沒有裁切 UI，修圖結果目前仍是 mock
    // （沒有真的結果圖），走 buildOutputFile 只會把「未修圖的原圖」4:3 置中裁掉一截當修圖版上傳，
    // 所以維持 mock 另存，等 retouch 接上真實結果圖再改。
    if (selectedAssetUrl.value && props.mode !== 'retouch') {
      const file = await buildOutputFile(payload.name)
      const saved = await upload(file, payload.folder || undefined, selectedAssetId.value || undefined, payload.name)
      savedAssetId.value = saved.id
      if (payload.alsoDownload) downloadRealFile(file)
    } else {
      const saved = await saveEdited(payload.name, { folder: payload.folder })
      savedAssetId.value = saved.id
      if (payload.alsoDownload) downloadEditedCopy(payload.name)
    }
    saveDialogOpen.value = false
  } catch (err) {
    saveError.value = true
    saveErrorMessage.value = classifySaveError(err)
  } finally {
    savingAsset.value = false
  }
}
// 文字圖層是多實例架構（比照 ObjectEditorLayer）：內容／位置／字級／字型／顏色都
// 存在各自的圖層物件裡（見 TextEditorLayer），這裡只保留「目前正在拖曳／編輯的是
// 哪一筆」跟「哪一筆圖層的 DOM 節點是哪個」這種跨圖層共用的輔助狀態。
const textObjectRefs = new Map<string, HTMLElement>()
const setTextObjectRef = (key: string, el: Element | ComponentPublicInstance | null) => {
  if (el instanceof HTMLElement) textObjectRefs.set(key, el)
  else textObjectRefs.delete(key)
}
const draggingTextKey = ref('')
const editingTextKey = ref('')
const zoomPercent = ref(80)
const zoomMin = 40
const zoomMax = 160
const zoomStep = 10
const canZoomOut = computed(() => zoomPercent.value > zoomMin)
const canZoomIn = computed(() => zoomPercent.value < zoomMax)
const artboardZoomStyle = computed(() => ({ transform: `scale(${zoomPercent.value / 100})` }))
const zoomOut = () => {
  zoomPercent.value = Math.max(zoomMin, zoomPercent.value - zoomStep)
}
const zoomIn = () => {
  zoomPercent.value = Math.min(zoomMax, zoomPercent.value + zoomStep)
}
// 選項與 Figma `list_font`（node 1157:872）逐項對齊：兩個分組、九個字體家族，不多不少。
// Figma 的屬性面板只有「文字內容／字型／字級／對齊」，沒有字重選擇器，因此字重固定 700。
const fontOptions = [
  { id: 'notoSansTC', group: 'zh', family: "'Noto Sans TC', sans-serif", weight: 700 },
  { id: 'notoSerifTC', group: 'zh', family: "'Noto Serif TC', serif", weight: 700 },
  { id: 'inter', group: 'latin', family: "'Inter', sans-serif", weight: 700 },
  { id: 'roboto', group: 'latin', family: "'Roboto', sans-serif", weight: 700 },
  { id: 'arial', group: 'latin', family: 'Arial, Helvetica, sans-serif', weight: 700 },
  { id: 'helvetica', group: 'latin', family: 'Helvetica, Arial, sans-serif', weight: 700 },
  { id: 'georgia', group: 'latin', family: "Georgia, 'Times New Roman', serif", weight: 700 },
  { id: 'timesNewRoman', group: 'latin', family: "'Times New Roman', Times, serif", weight: 700 },
  { id: 'courierNew', group: 'latin', family: "'Courier New', Courier, monospace", weight: 700 },
] as const
const fontGroups = [
  { id: 'zh' as const, options: fontOptions.filter((option) => option.group === 'zh') },
  { id: 'latin' as const, options: fontOptions.filter((option) => option.group === 'latin') },
]
type FontId = (typeof fontOptions)[number]['id']
// 設計稿的字型選單是自訂面板（每列有副標、選中列有打勾），原生 select 的 option 由
// 作業系統繪製，做不出這個樣式，因此自行實作 listbox。
const fontMenuOpen = ref(false)
const fontSelectEl = ref<HTMLElement | null>(null)
const selectFont = (id: FontId) => {
  if (selectedTextLayer.value) selectedTextLayer.value.fontId = id
  fontMenuOpen.value = false
}
useDismissableMenu(fontMenuOpen, fontSelectEl)
const textLayerStyle = (layer: TextEditorLayer) => {
  const font = fontOptions.find((option) => option.id === layer.fontId) ?? fontOptions[0]
  return {
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    color: layer.color,
    fontFamily: font.family,
    fontWeight: font.weight,
    fontSize: `${1.25 * layer.scale}rem`,
    zIndex: layerZIndex(layer.key),
  }
}
const retouchSetupOpen = ref(false)
const retouchMethod = ref<'quick' | 'command'>('quick')
const commandRetouchBaseCost = computed(() => pricing.value?.commandBase ?? 0)
const retouchInstruction = ref('')
// 對齊 Figma（1140:768 row_presets）：點選常用指令快速帶入文字，仍可自行編輯／接續輸入。
const COMMAND_PRESET_KEYS = [
  'removePasserby',
  'changeBackground',
  'brighten',
  'deglare',
  'fillLight',
  'extend',
  'removeWatermark',
] as const
const commandPresets = computed(() =>
  COMMAND_PRESET_KEYS.map((key) => ({ key, label: t(`editor.retouch.commandPresets.${key}`) })),
)
const applyCommandPreset = (label: string) => {
  retouchInstruction.value = retouchInstruction.value.trim()
    ? `${retouchInstruction.value}、${label}`.slice(0, 200)
    : label
}
const lastRetouchCost = ref(16)
const lastRetouchKeys = ref(['removeObjects', 'repair'])
const lastRetouchMethod = ref<'quick' | 'command'>('quick')
const retouchSelections: Record<'quick' | 'command', string[]> = {
  quick: ['removeObjects', 'repair'],
  command: [],
}
watch(
  () => props.mode,
  () => {
    tool.value = 'remove'
    retouchSetupOpen.value = false
  },
)
// 對齊 Figma（1311:580／1311:814／1311:820）修圖結果面板的 loading_box。
// 步驟文字（stepLabel）仍用實際選取的項目模擬逐步進度；但進度條與「約剩 X 秒」
// 兩者要對得上同一份時間軸，所以改成共用同一個估計總秒數：每步驟抓 9 秒，
// 對齊 Figma 範例「步驟 2/3・約剩 18 秒」（還剩 2 步 × 9 秒）。進度條寬度＝
// 已過秒數 ÷ 估計總秒數，從 0% 開始隨秒數真的慢慢變滿，不是原本那種只依
// 步驟數跳格子（例如只選 2 個項目時，進度條會直接從 50% 起跳，看起來像是
// 「已經做了一半」而非「才剛開始」）。
// mock 本身 900ms 就回來，這組秒數只是先把畫面感覺做出來——等後端 /edit
// 真的接上、有實際生成耗時後，要換成後端回傳（或至少量測過）的秒數，不能
// 一直用這個猜的常數。
const RETOUCH_SECONDS_PER_STEP = 9
const retouchStepIndex = ref(0)
const retouchTotalSeconds = ref(1)
const retouchSecondsRemaining = ref(0)
const retouchStepNames = computed(() =>
  retouchMethod.value === 'quick'
    ? retouchOptionsForMethod.value
        .filter((option) => option.on)
        .map((option) => t(`editor.retouch.options.${option.key}.name`))
    : [t('editor.retouch.command')],
)
const retouchStepLabel = computed(() => {
  const names = retouchStepNames.value
  if (!names.length) return ''
  const current = Math.min(retouchStepIndex.value, names.length - 1)
  return t('editor.retouch.stepLabel', { current: current + 1, total: names.length, name: names[current] })
})
const retouchProgressPercent = computed(() => {
  const total = retouchTotalSeconds.value || 1
  const elapsed = total - retouchSecondsRemaining.value
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
})
const retouchTimeRemainingLabel = computed(() =>
  t('editor.retouch.timeRemaining', { seconds: retouchSecondsRemaining.value }),
)
// 送出修圖：扣款與最終金額都以後端為準，畫面上的預估只是預估。
// 送出的項目取 retouchOptionsForMethod（而非全部），否則指令式修圖會把沒收費的快速項目也列進結果。
async function startRetouch() {
  if (!canStartRetouch.value || retouching.value) return
  retouching.value = true
  retouchError.value = ''
  retouchStepIndex.value = 0
  const totalSteps = retouchStepNames.value.length || 1
  retouchTotalSeconds.value = totalSteps * RETOUCH_SECONDS_PER_STEP
  retouchSecondsRemaining.value = retouchTotalSeconds.value
  const stepTimer = setInterval(
    () => {
      if (retouchStepIndex.value < totalSteps - 1) retouchStepIndex.value += 1
    },
    Math.max(200, 900 / totalSteps),
  )
  const secondsTimer = setInterval(() => {
    if (retouchSecondsRemaining.value > 1) retouchSecondsRemaining.value -= 1
  }, 1000)
  try {
    const result = await api.retouchImage({
      method: retouchMethod.value,
      options: retouchOptionsForMethod.value.filter((option) => option.on).map((option) => option.key),
      instruction: retouchInstruction.value.trim() || undefined,
    })
    lastRetouchCost.value = result.cost
    lastRetouchKeys.value = result.options
    lastRetouchMethod.value = result.method
    retouchSetupOpen.value = false
    await feed.refresh()
  } catch (error) {
    retouchError.value = isInsufficientFeed(error) ? t('errors.insufficientFeed') : t('errors.generationFailed')
  } finally {
    clearInterval(stepTimer)
    clearInterval(secondsTimer)
    retouching.value = false
  }
}

// 背景移除是「執行當下即扣」，同一張素材只扣一次；其餘工具不扣飼料。
// removeOverlayDismissed：mock 的扣款發生在 api.applyEditTool 內部、無法真的中止，
// 「取消」只先收合等待畫面，操作仍會照常完成並入帳（延遲很短，實務上不太會遇到）。
const removeOverlayDismissed = ref(false)
async function selectRemoveTool() {
  tool.value = 'remove'
  if (applyingTool.value || usedTools.value.some((item) => item.tool === 'remove')) return
  applyingTool.value = 'remove'
  removeOverlayDismissed.value = false
  toolError.value = ''
  try {
    usedTools.value.push(await api.applyEditTool('remove'))
    await feed.refresh()
  } catch (error) {
    toolError.value = isInsufficientFeed(error) ? t('errors.insufficientFeed') : t('errors.generationFailed')
  } finally {
    applyingTool.value = ''
  }
}
type EditorLayerType = 'text' | 'object' | 'original'
type EditorLayer = {
  key: string
  type: EditorLayerType
  visible: boolean
  locked: boolean
  label?: string
}
type ObjectEditorLayer = EditorLayer & {
  type: 'object'
  x: number
  y: number
  scale: number
  dragging: boolean
  // 圖庫選來的圖；AI 生成（mock）沒有真圖時為空字串，畫布顯示佔位圖示、另存合成時略過
  url: string
}
// 文字圖層是多實例架構（比照 ObjectEditorLayer）：內容／位置／字級／字型／顏色都是
// 圖層自己的欄位，layers 陣列可以同時存在多筆，彼此獨立。
type TextEditorLayer = EditorLayer & {
  type: 'text'
  content: string
  color: string
  x: number
  y: number
  scale: number
  fontId: FontId
}
// 圖層清單初始為空（decision 2）：原圖圖層只在 selectEditorAsset() 真的選定素材
// 之後才會被 push 進來，元件掛載當下沒有任何圖層，也就沒有任何圖層被選取。
const layers = reactive<EditorLayer[]>([])
const selectedLayerKey = ref('')
const draggedLayerKey = ref('')
const dropTargetKey = ref('')
const layerLabel = (layer: EditorLayer) => {
  if (layer.type === 'original') return t('editor.layerItems.original', { name: selectedAssetName.value })
  if (layer.type === 'text') return t('editor.layerItems.text', { text: (layer as TextEditorLayer).content })
  return layer.label ?? t(`editor.layerItems.${layer.type}`)
}
const layerDescription = (layer: EditorLayer) => {
  if (layer.type === 'original') return t(layer.locked ? 'editor.originalLocked' : 'editor.originalUnlocked')
  // 有 url 的是圖庫選來的物件，沒有的才是 AI 生成（mock）
  if (layer.type === 'object' && (layer as ObjectEditorLayer).url) return t('editor.layerDescriptions.objectLibrary')
  return t(`editor.layerDescriptions.${layer.type}`)
}
const selectLayer = (key: string) => {
  const layer = layers.find((item) => item.key === key)
  if (!layer) return
  selectedLayerKey.value = key
  if (layer.type !== 'original') tool.value = layer.type
}
const textLayers = computed(() => layers.filter((layer): layer is TextEditorLayer => layer.type === 'text'))
const objectLayers = computed(() => layers.filter((layer): layer is ObjectEditorLayer => layer.type === 'object'))
const originalLayer = computed(() => layers.find((layer) => layer.key === 'original'))
const selectedLayer = computed(() => layers.find((layer) => layer.key === selectedLayerKey.value))
const selectedTextLayer = computed(() =>
  selectedLayer.value?.type === 'text' ? (selectedLayer.value as TextEditorLayer) : undefined,
)
// 有值時「從圖庫選擇」＝更換這個物件圖層的圖片（按鈕顯示「更換圖片」）；沒有才新增圖層到框選範圍
const selectedObjectLayer = computed(() =>
  selectedLayer.value?.type === 'object' ? (selectedLayer.value as ObjectEditorLayer) : undefined,
)
// 物件工具下點畫布空白處或框選範圍＝取消物件圖層的選取，讓下一次選圖回到「新增」。
// 物件／文字圖層的 pointerdown 都有 .stop，點到圖層本身不會走到這裡。
const deselectObjectLayer = () => {
  if (tool.value === 'object' && selectedObjectLayer.value) selectedLayerKey.value = ''
}
const canDuplicateSelectedLayer = computed(
  () => selectedLayer.value?.type === 'object' || selectedLayer.value?.type === 'text',
)
const layerZIndex = (key: string) => {
  const index = layers.findIndex((layer) => layer.key === key)
  return index < 0 ? 1 : layers.length - index + 1
}
const moveLayerBefore = (movingKey: string, targetKey: string) => {
  if (movingKey === targetKey || movingKey === 'original') return
  const movingIndex = layers.findIndex((layer) => layer.key === movingKey)
  const targetIndex = layers.findIndex((layer) => layer.key === targetKey)
  if (movingIndex < 0 || targetIndex < 0) return
  const [movingLayer] = layers.splice(movingIndex, 1)
  if (!movingLayer) return
  const nextTargetIndex = layers.findIndex((layer) => layer.key === targetKey)
  layers.splice(nextTargetIndex, 0, movingLayer)
}
const startLayerDrag = (event: DragEvent, key: string) => {
  if (key === 'original') return
  draggedLayerKey.value = key
  dropTargetKey.value = ''
  event.dataTransfer?.setData('text/plain', key)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
const setLayerDropTarget = (key: string) => {
  if (!draggedLayerKey.value || draggedLayerKey.value === key) return
  dropTargetKey.value = key
}
const clearLayerDropTarget = (event: DragEvent, key: string) => {
  const nextTarget = event.relatedTarget as Node | null
  if (nextTarget && (event.currentTarget as HTMLElement).contains(nextTarget)) return
  if (dropTargetKey.value === key) dropTargetKey.value = ''
}
const finishLayerDrag = () => {
  draggedLayerKey.value = ''
  dropTargetKey.value = ''
}
const dropLayerBefore = (targetKey: string) => {
  if (draggedLayerKey.value) moveLayerBefore(draggedLayerKey.value, targetKey)
  finishLayerDrag()
}
const handleLayerOrderKeydown = (event: KeyboardEvent, key: string) => {
  if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  const currentIndex = layers.findIndex((layer) => layer.key === key)
  const lastMovableIndex = layers.findIndex((layer) => layer.key === 'original') - 1
  if (currentIndex < 0 || lastMovableIndex < 0) return
  const nextIndex = Math.max(0, Math.min(lastMovableIndex, currentIndex + (event.key === 'ArrowUp' ? -1 : 1)))
  if (nextIndex === currentIndex) return
  const [movingLayer] = layers.splice(currentIndex, 1)
  if (!movingLayer) return
  layers.splice(nextIndex, 0, movingLayer)
}
// 每次點擊「文字」工具都新增一筆獨立的新圖層（比照 addObjectLayer），不再判斷
// 「已經有就重用」——這樣文字圖層才能像物件圖層一樣同時存在多筆。
function addTextLayer() {
  const key = `text-${crypto.randomUUID()}`
  const layer: TextEditorLayer = {
    key,
    type: 'text',
    visible: true,
    locked: false,
    content: t('editor.newTextPlaceholder'),
    color: '#2e3567',
    x: 50,
    y: 58,
    scale: 1,
    fontId: 'notoSansTC',
  }
  layers.unshift(layer)
  selectedLayerKey.value = key
  savedAssetId.value = ''
  return layer
}
const insertTextLayer = async () => {
  tool.value = 'text'
  const layer = addTextLayer()
  await beginTextEdit(layer.key)
}
// 「加入物件」有兩條路：(1) 從圖庫選圖（openObjectPicker → selectEditorAsset 的 object 分支）建立
// 有真圖 url 的物件圖層；(2) AI 生成（mock，對齊 Figma 1141:906）：畫布上先框選範圍、右側面板輸入
// 描述（常用物件預設可快速帶入），「生成物件」才建立一個佔位圖層。下面這幾個狀態只服務 (2)。
// 加入物件本身不扣飼料（見 editor.costNote）。
const objectSelection = reactive({ x: 43, y: 17, width: 37, height: 36 })
const objectDescription = ref('')
const generatingObject = ref(false)
const OBJECT_PRESET_KEYS = ['bouquet', 'plant', 'tableware', 'shadow', 'card'] as const
const objectPresets = computed(() =>
  OBJECT_PRESET_KEYS.map((key) => ({ key, label: t(`editor.addObject.presets.${key}`) })),
)
const applyObjectPreset = (label: string) => {
  objectDescription.value = objectDescription.value.trim() ? `${objectDescription.value}、${label}` : label
}
// 圖庫選來的圖（有 url）以原始比例 aspect contain 進框選範圍、中心對齊框中心；AI 生成（mock）沿用框選範圍的位置。
function addObjectLayer(description: string, url = '', aspect = 1) {
  const placed = url ? containLayerInBox(objectSelection, aspect, ARTBOARD_ASPECT) : null
  const key = `object-${crypto.randomUUID()}`
  const layer: ObjectEditorLayer = {
    key,
    type: 'object',
    visible: true,
    locked: false,
    label: t('editor.objectLayerDynamic', { name: description }),
    x: placed ? placed.x : objectSelection.x,
    y: placed ? placed.y : objectSelection.y,
    scale: placed ? placed.widthPercent / OBJECT_LAYER_WIDTH_PERCENT : 1,
    dragging: false,
    url,
  }
  layers.unshift(layer)
  selectedLayerKey.value = key
  savedAssetId.value = ''
}
function duplicateSelectedLayer() {
  const source = selectedLayer.value
  if (!source || (source.type !== 'object' && source.type !== 'text')) return
  const key = `${source.type}-${crypto.randomUUID()}`
  const duplicated =
    source.type === 'object'
      ? ({ ...(source as ObjectEditorLayer), key, dragging: false } as ObjectEditorLayer)
      : ({ ...(source as TextEditorLayer), key } as TextEditorLayer)
  layers.unshift(duplicated)
  selectedLayerKey.value = key
  savedAssetId.value = ''
}
// 圖片寬高比以瀏覽器載入後的 naturalWidth／Height 為準——畫布上的 <img> 顯示的就是它（套 EXIF 方向；
// mock 的 Asset.width／height 也跟實圖不符），載不到才退回後端量的尺寸，再不行當正方形。
// 不帶 crossOrigin：與畫布 <img> 同一種請求，共用快取（見 loadImageForCanvas 的說明）。
async function imageAspect(url: string, fallback: { width?: number; height?: number }) {
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img.naturalWidth / img.naturalHeight
  } catch {
    return fallback.width && fallback.height ? fallback.width / fallback.height : 1
  }
}
// MOCK：生成物件目前沒有真的 AI 影像產出，僅模擬一段生成延遲後直接建立圖層。
async function generateObjectFromDescription() {
  const description = objectDescription.value.trim()
  if (!description || generatingObject.value) return
  generatingObject.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 700))
    addObjectLayer(description)
    objectDescription.value = ''
  } finally {
    generatingObject.value = false
  }
}
const toggleOriginalLock = () => {
  // 這個函式只會被圖層清單裡「原圖」那一列的鎖定按鈕觸發，該按鈕本身只在
  // originalLayer 存在時才會被渲染出來，但型別上 originalLayer 仍然可能是
  // undefined（decision 3），這裡用區域變數做一次防呆，滿足型別檢查。
  const layer = originalLayer.value
  if (!layer) return
  layer.locked = !layer.locked
  if (layer.locked) layer.visible = true
}
const RETOUCH_OPTION_KEYS: RetouchOptionKey[] = ['removeObjects', 'repair', 'lighting', 'upscale']
// cost／free 由 getEditorPricing 填入，這裡只保留預設勾選狀態
const retouchOptions = ref(RETOUCH_OPTION_KEYS.map((key, index) => ({ key, on: index < 2, free: true, cost: 0 })))
// 對齊 Figma（1140:714 指令修圖）：指令修圖沒有可勾選的加購項目，只有一口價的基本費，
// 所以這裡回傳空陣列——estimatedRetouchCost／送出時就只會計入 commandRetouchBaseCost。
const retouchOptionsForMethod = computed(() => (retouchMethod.value === 'command' ? [] : retouchOptions.value))
function setRetouchMethod(method: 'quick' | 'command') {
  if (retouchMethod.value === method) return

  retouchSelections[retouchMethod.value] = retouchOptions.value
    .filter((option) => option.on)
    .map((option) => option.key)
  retouchMethod.value = method
  retouchOptions.value.forEach((option) => {
    option.on = retouchSelections[method].includes(option.key)
  })
}
const estimatedRetouchCost = computed(
  () =>
    (retouchMethod.value === 'command' ? commandRetouchBaseCost.value : 0) +
    retouchOptionsForMethod.value.reduce((total, option) => total + (option.on ? option.cost : 0), 0),
)
const canStartRetouch = computed(
  () => hasSelectedAsset.value && (retouchMethod.value === 'quick' || retouchInstruction.value.trim().length > 0),
)
const retouchAppliedLabel = computed(() => {
  if (lastRetouchMethod.value === 'command') {
    if (lastRetouchKeys.value.length === 0) return t('editor.retouch.commandApplied')
    return t('editor.retouch.commandAppliedDynamic', {
      items: lastRetouchKeys.value.map((key) => t(`editor.retouch.options.${key}.name`)).join('・'),
    })
  }
  return t('editor.retouch.appliedDynamic', {
    items: lastRetouchKeys.value.map((key) => t(`editor.retouch.options.${key}.name`)).join('・'),
  })
})
type CropRatioId = 'original' | 'square' | 'fourFive' | 'story' | 'wide' | 'custom'
type CropCorner = 'nw' | 'ne' | 'sw' | 'se'
const artboardRef = ref<HTMLElement | null>(null)
const artboardBaseHeight = ref(0)
let artboardResizeObserver: ResizeObserver | undefined
const canvasHintStyle = computed(() => ({
  marginTop: `${Math.max(0, ((zoomPercent.value / 100 - 1) * artboardBaseHeight.value) / 2)}px`,
}))
watch(
  artboardRef,
  (element) => {
    artboardResizeObserver?.disconnect()
    artboardResizeObserver = undefined
    if (!element) return

    const updateBaseHeight = () => {
      artboardBaseHeight.value = element.offsetHeight
    }
    updateBaseHeight()
    artboardResizeObserver = new ResizeObserver(updateBaseHeight)
    artboardResizeObserver.observe(element)
  },
  { flush: 'post' },
)
const textDrag = usePercentDrag()
const textResizeDrag = usePointerDrag()
const objectPointerDrag = usePointerDrag()
const objectDrag = usePercentDrag(objectPointerDrag)
const objectSelectionPointerDrag = usePointerDrag()
const objectSelectionDrag = usePercentDrag(objectSelectionPointerDrag)
const objectSelectionDragging = ref(false)
const objectSelectionStyle = computed(() => ({
  left: `${objectSelection.x}%`,
  top: `${objectSelection.y}%`,
  width: `${objectSelection.width}%`,
  height: `${objectSelection.height}%`,
}))
// 對齊 Figma 的框選（1141:1140）：只支援拖曳移動範圍，暫不支援拖角縮放
// （四個 handle 先做視覺對齊，縮放留待有真的 AI 生成範圍需求時再補）。
const startObjectSelectionDrag = (event: PointerEvent) => {
  deselectObjectLayer()
  if (event.button !== 0 || !artboardRef.value) return
  event.preventDefault()
  const artboardBounds = artboardRef.value.getBoundingClientRect()
  const selectionBounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  objectSelectionDragging.value = true
  objectSelectionDrag.start({
    containerBounds: artboardBounds,
    elementBounds: selectionBounds,
    startEvent: event,
    startX: objectSelection.x,
    startY: objectSelection.y,
    onDrag: (x, y) => {
      objectSelection.x = x
      objectSelection.y = y
    },
    onEnd: () => {
      objectSelectionDragging.value = false
    },
  })
}
const startTextDrag = (event: PointerEvent, layer: TextEditorLayer) => {
  if (editingTextKey.value === layer.key || event.button !== 0 || !artboardRef.value) return
  event.preventDefault()
  selectLayer(layer.key)
  const artboardBounds = artboardRef.value.getBoundingClientRect()
  const textBounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  draggingTextKey.value = layer.key
  textDrag.start({
    containerBounds: artboardBounds,
    elementBounds: textBounds,
    startEvent: event,
    startX: layer.x,
    startY: layer.y,
    onDrag: (x, y) => {
      layer.x = x
      layer.y = y
    },
    onEnd: () => {
      draggingTextKey.value = ''
    },
  })
}
const objectLayerStyle = (layer: ObjectEditorLayer) => ({
  left: `${layer.x}%`,
  top: `${layer.y}%`,
  width: `${(layer.url ? OBJECT_LAYER_WIDTH_PERCENT : PLACEHOLDER_WIDTH_PERCENT) * layer.scale}%`,
  zIndex: layerZIndex(layer.key),
})
const startObjectDrag = (event: PointerEvent, layer: ObjectEditorLayer) => {
  if (event.button !== 0 || !artboardRef.value) return
  event.preventDefault()
  selectLayer(layer.key)
  const artboardBounds = artboardRef.value.getBoundingClientRect()
  const objectBounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  layer.dragging = true
  objectDrag.start({
    containerBounds: artboardBounds,
    elementBounds: objectBounds,
    startEvent: event,
    startX: layer.x,
    startY: layer.y,
    onDrag: (x, y) => {
      layer.x = x
      layer.y = y
    },
    onEnd: () => {
      layer.dragging = false
    },
  })
}
const startObjectResize = (event: PointerEvent, layer: ObjectEditorLayer, _corner: CropCorner) => {
  if (event.button !== 0) return
  event.preventDefault()
  selectLayer(layer.key)
  const bounds = (event.currentTarget as HTMLElement).parentElement?.getBoundingClientRect()
  if (!bounds) return
  const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  const startDistance = Math.max(1, Math.hypot(event.clientX - center.x, event.clientY - center.y))
  const startScale = layer.scale
  objectPointerDrag.start((moveEvent) => {
    const distance = Math.hypot(moveEvent.clientX - center.x, moveEvent.clientY - center.y)
    layer.scale = Math.max(0.35, Math.min(2.5, startScale * (distance / startDistance)))
  })
}
const handleObjectResizeKeydown = (event: KeyboardEvent, layer: ObjectEditorLayer) => {
  if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
  event.preventDefault()
  const increase = event.key === 'ArrowUp' || event.key === 'ArrowRight'
  const step = event.shiftKey ? 0.1 : 0.05
  layer.scale = Math.max(0.35, Math.min(2.5, layer.scale + (increase ? step : -step)))
}
const beginTextEdit = async (key: string) => {
  editingTextKey.value = key
  await nextTick()
  const element = textObjectRefs.get(key)
  if (!element) return
  element.focus()
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(element)
  selection?.removeAllRanges()
  selection?.addRange(range)
}
const finishTextEdit = (key: string) => {
  if (editingTextKey.value !== key) return
  const layer = layers.find((item): item is TextEditorLayer => item.key === key && item.type === 'text')
  if (layer) layer.content = textObjectRefs.get(key)?.textContent ?? ''
  editingTextKey.value = ''
}
const handleTextKeydown = (event: KeyboardEvent, key: string) => {
  const isEditing = editingTextKey.value === key
  if (!isEditing && (event.key === 'Enter' || event.key === 'F2')) {
    event.preventDefault()
    void beginTextEdit(key)
    return
  }
  if (isEditing && event.key === 'Enter') {
    event.preventDefault()
    finishTextEdit(key)
    ;(event.currentTarget as HTMLElement).blur()
  } else if (isEditing && event.key === 'Escape') {
    event.preventDefault()
    editingTextKey.value = ''
    const layer = layers.find((item): item is TextEditorLayer => item.key === key && item.type === 'text')
    const element = event.currentTarget as HTMLElement
    element.textContent = layer?.content ?? ''
    element.blur()
  }
}
const resizeTextBy = (layer: TextEditorLayer, amount: number) => {
  layer.scale = Math.max(0.5, Math.min(3, layer.scale + amount))
}
const handleTextResizeKeydown = (event: KeyboardEvent, layer: TextEditorLayer) => {
  if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
  event.preventDefault()
  resizeTextBy(layer, event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 0.1 : -0.1)
}
const startTextResize = (event: PointerEvent, layer: TextEditorLayer, corner: CropCorner) => {
  if (event.button !== 0) return
  event.preventDefault()
  const start = { x: event.clientX, y: event.clientY, scale: layer.scale }
  const horizontalDirection = corner.includes('w') ? -1 : 1
  const verticalDirection = corner.includes('n') ? -1 : 1
  textResizeDrag.start((moveEvent) => {
    const delta =
      ((moveEvent.clientX - start.x) * horizontalDirection + (moveEvent.clientY - start.y) * verticalDirection) / 160
    layer.scale = Math.max(0.5, Math.min(3, start.scale + delta))
  })
}
const cropRect = reactive({ x: 12.5, y: 0, width: 75, height: 100 })
// 另存會把所有圖層合成進去，所以任何圖層的內容／位置／縮放／顯示與否／順序改變都要重新標記
// 「有未儲存的變更」，不只文字圖層；用字串化目前欄位的 fingerprint 取代逐欄位 watch。
const layersFingerprint = computed(() =>
  layers
    .map((layer) => {
      const base = `${layer.key}:${layer.visible}`
      if (layer.type === 'text') {
        const { content, color, scale, fontId, x, y } = layer as TextEditorLayer
        return `${base}:${content}:${color}:${scale}:${fontId}:${x}:${y}`
      }
      if (layer.type === 'object') {
        const { x, y, scale, url } = layer as ObjectEditorLayer
        return `${base}:${x}:${y}:${scale}:${url}`
      }
      return base
    })
    .join('|'),
)
watch(
  [
    layersFingerprint,
    tool,
    retouchInstruction,
    () => retouchOptions.value.map((option) => `${option.key}:${option.on}`).join('|'),
    () => `${cropRect.x}:${cropRect.y}:${cropRect.width}:${cropRect.height}`,
  ],
  () => {
    savedAssetId.value = ''
    saveError.value = false
    saveErrorMessage.value = ''
  },
)
const ratioOptions = computed<Array<{ id: Exclude<CropRatioId, 'custom'>; label: string; aspect: number }>>(() => [
  { id: 'original', label: t('editor.originalRatio'), aspect: 4 / 3 },
  { id: 'square', label: '1:1', aspect: 1 },
  { id: 'fourFive', label: '4:5', aspect: 4 / 5 },
  { id: 'story', label: '9:16', aspect: 9 / 16 },
  { id: 'wide', label: '16:9', aspect: 16 / 9 },
])
const cropFrameStyle = computed(() => ({
  left: `${cropRect.x}%`,
  top: `${cropRect.y}%`,
  width: `${cropRect.width}%`,
  height: `${cropRect.height}%`,
}))
// 畫面上的裁切尺寸（畫布徽章／提示／側欄「已裁切為 … （原圖 …）」）一律從所選素材的真尺寸
// 換算，跟 buildOutputFile 走同一套 cropSourceRect，顯示的數字就是實際另存出來的像素；
// 原圖尺寸還不知道（見 originalDimensions）時回 null，各處不顯示那行。
const cropOutputDimensions = computed(() => {
  const orig = originalDimensions.value
  if (!orig) return null
  const rect = cropSourceRect(orig.width, orig.height)
  return {
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
    origWidth: orig.width,
    origHeight: orig.height,
  }
})
const canvasHint = computed(() => {
  if (tool.value !== 'crop') return t('editor.selectionInstruction')
  return cropOutputDimensions.value ? t('editor.cropInstructionDynamic', cropOutputDimensions.value) : ''
})
const applyCropRatio = (id: Exclude<CropRatioId, 'custom'>) => {
  ratio.value = id
  const aspect = ratioOptions.value.find((item) => item.id === id)?.aspect ?? 1
  const artboardAspect = 4 / 3
  if (aspect >= artboardAspect) {
    cropRect.width = 100
    cropRect.height = (artboardAspect / aspect) * 100
    cropRect.x = 0
    cropRect.y = (100 - cropRect.height) / 2
  } else {
    cropRect.height = 100
    cropRect.width = (aspect / artboardAspect) * 100
    cropRect.x = (100 - cropRect.width) / 2
    cropRect.y = 0
  }
}
const resetCrop = () => applyCropRatio('square')
// 對齊 Figma（1144:570 裁切套用後）：選好固定比例（非自訂拖曳）視為「已套用」，
// 畫布顯示套用結果徽章與「復原裁切／重新裁切／另存為新素材」，而不是拖曳把手。
const cropRatioLabel = computed(() => ratioOptions.value.find((item) => item.id === ratio.value)?.label ?? '')
const undoAppliedCrop = () => applyCropRatio('original')
// 使用者反饋：「復原裁切／重新裁切／另存為新素材」三個按鈕在自訂裁切時也要一起顯示，
// 不能只有固定比例才有。已經在自訂模式時，「重新裁切」改成把取景框重設為滿版，
// 讓按鈕在兩種狀態下都有實際作用，而不是點了沒反應。
const recropCustom = () => {
  if (ratio.value !== 'custom') {
    ratio.value = 'custom'
    return
  }
  cropRect.x = 0
  cropRect.y = 0
  cropRect.width = 100
  cropRect.height = 100
}
const cropResizeDrag = usePointerDrag()
// 使用者需求：拖曳固定比例的裁切框角落把手時，應該維持該比例做等比例縮放（放大／縮小
// 取景範圍），而不是像自訂模式一樣寬高各自變形、也不應該把 ratio 悄悄改成「自訂」——
// 「自訂」仍然是使用者要主動點選才會進入的無比例限制模式。
const startCropResize = (event: PointerEvent, corner: CropCorner) => {
  if (!artboardRef.value) return
  event.preventDefault()
  const bounds = artboardRef.value.getBoundingClientRect()
  const start = { pointerX: event.clientX, pointerY: event.clientY, ...cropRect }
  const lockedAspect =
    ratio.value === 'custom' ? null : (ratioOptions.value.find((item) => item.id === ratio.value)?.aspect ?? null)
  const minSize = 10
  cropResizeDrag.start((moveEvent) => {
    if (lockedAspect) {
      const horizontalDirection = corner.includes('w') ? -1 : 1
      const verticalDirection = corner.includes('n') ? -1 : 1
      const growthPx =
        ((moveEvent.clientX - start.pointerX) * horizontalDirection +
          (moveEvent.clientY - start.pointerY) * verticalDirection) /
        2
      const startWidthPx = (start.width / 100) * bounds.width
      const anchorXPx = corner.includes('w')
        ? ((start.x + start.width) / 100) * bounds.width
        : (start.x / 100) * bounds.width
      const anchorYPx = corner.includes('n')
        ? ((start.y + start.height) / 100) * bounds.height
        : (start.y / 100) * bounds.height
      const maxWidthPx = corner.includes('w') ? anchorXPx : bounds.width - anchorXPx
      const maxHeightPx = corner.includes('n') ? anchorYPx : bounds.height - anchorYPx
      const minWidthPx = Math.min(maxWidthPx, Math.max(40, bounds.width * (minSize / 100)))
      const maxAllowedWidthPx = Math.max(minWidthPx, Math.min(maxWidthPx, maxHeightPx * lockedAspect))
      const newWidthPx = Math.max(minWidthPx, Math.min(maxAllowedWidthPx, startWidthPx + growthPx))
      const newHeightPx = newWidthPx / lockedAspect
      cropRect.width = (newWidthPx / bounds.width) * 100
      cropRect.height = (newHeightPx / bounds.height) * 100
      cropRect.x = corner.includes('w')
        ? ((anchorXPx - newWidthPx) / bounds.width) * 100
        : (anchorXPx / bounds.width) * 100
      cropRect.y = corner.includes('n')
        ? ((anchorYPx - newHeightPx) / bounds.height) * 100
        : (anchorYPx / bounds.height) * 100
      return
    }
    const dx = ((moveEvent.clientX - start.pointerX) / bounds.width) * 100
    const dy = ((moveEvent.clientY - start.pointerY) / bounds.height) * 100
    const right = start.x + start.width
    const bottom = start.y + start.height
    if (corner.includes('w')) {
      cropRect.x = Math.max(0, Math.min(right - minSize, start.x + dx))
      cropRect.width = right - cropRect.x
    } else {
      cropRect.width = Math.max(minSize, Math.min(100 - start.x, start.width + dx))
    }
    if (corner.includes('n')) {
      cropRect.y = Math.max(0, Math.min(bottom - minSize, start.y + dy))
      cropRect.height = bottom - cropRect.y
    } else {
      cropRect.height = Math.max(minSize, Math.min(100 - start.y, start.height + dy))
    }
  })
}
const cropMoveDrag = usePointerDrag()
const cropDragging = ref(false)
// 使用者需求：點在裁切框「白色可見範圍」內、按住滑鼠左鍵拖曳時，整個取景框要跟著滑鼠
// 上下左右移動，放開左鍵才停止——不論目前是自訂還是固定比例，都只改變框的位置（x/y），
// 不改變寬高／比例。四個角落把手的 pointerdown 都有 .stop，不會冒泡到這裡，
// 「移動」跟「縮放」兩種拖曳互不干擾。
const startCropMove = (event: PointerEvent) => {
  if (event.button !== 0 || !artboardRef.value) return
  event.preventDefault()
  const bounds = artboardRef.value.getBoundingClientRect()
  const start = { pointerX: event.clientX, pointerY: event.clientY, x: cropRect.x, y: cropRect.y }
  cropDragging.value = true
  cropMoveDrag.start(
    (moveEvent) => {
      const dx = ((moveEvent.clientX - start.pointerX) / bounds.width) * 100
      const dy = ((moveEvent.clientY - start.pointerY) / bounds.height) * 100
      cropRect.x = Math.max(0, Math.min(100 - cropRect.width, start.x + dx))
      cropRect.y = Math.max(0, Math.min(100 - cropRect.height, start.y + dy))
    },
    () => {
      cropDragging.value = false
    },
  )
}

onBeforeUnmount(() => {
  artboardResizeObserver?.disconnect()
  cropResizeDrag.stop()
  cropMoveDrag.stop()
  textDrag.stop()
  textResizeDrag.stop()
  objectPointerDrag.stop()
  objectSelectionPointerDrag.stop()
})
const previews = computed(() =>
  ['igPost', 'igStory', 'fbPost', 'line'].map((key, index) => ({
    name: t(`editor.previews.${key}`),
    shape: ['square', 'portrait', 'fourFive', 'wide'][index],
    warn: ['square', 'story', 'fourFive', 'wide'][index] !== ratio.value,
  })),
)
</script>

<style scoped lang="scss">
.workspace {
  display: grid;
  width: 100%;
  grid-template-columns: 5rem minmax(22rem, 1fr) minmax(16rem, 20rem);
  gap: 1rem;
  flex: 1;
  min-height: 0;
  color: #383c4b;
}
.tools,
.canvasPanel,
.layers,
.cropPanel,
.retouchPanel,
.resultPanel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 7px rgba(96, 100, 114, 0.2);
  overflow: hidden;
}
.tools {
  padding: 0.625rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1875rem;
  height: 3.4375rem;
  border-radius: 8px;
  padding: 0.4375rem 0.1875rem;
  color: #606692;
  font-size: 0.6875rem;
}
.tool svg {
  width: 1.375rem;
  height: 1.375rem;
  font-size: 1.375rem;
  color: #a5c8e6;
}
.tool small {
  color: #ea903a;
}
.tool__cost {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  font-size: 0.625rem;
  line-height: normal;

  svg {
    width: 0.625rem;
    height: 0.625rem;
    flex-shrink: 0;
  }
}
.tool--object > svg {
  color: #2e3567;
}
.tool:first-child {
  height: 4.4375rem;
  padding-block: 0.375rem;
}
.tool.active {
  border: 1px solid #2e3567;
  background: #eff2fa;
  color: #2e3567;
}
.canvasPanel {
  display: flex;
  flex-direction: column;
}
.canvasHead,
.resultHead {
  height: 2.875rem;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  border-bottom: 1px solid #d2d5dd;
  font-size: 0.75rem;
}
.canvasHead strong {
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  color: #2e3567;
  font-size: 0.9375rem;
  line-height: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.canvasHead {
  min-height: 3.75rem;
  height: auto;
  padding: 0.75rem 1rem;
}
.canvasHead strong svg {
  width: 1.125rem;
  height: 1.125rem;
  margin-right: 0.375rem;
  vertical-align: -0.1875rem;
}
.canvasHead > span {
  flex: 0 0 auto;
  border: 1px solid #d2d5dd;
  border-radius: 16px;
  padding: 0.1875rem 0.75rem;
  color: #606692;
  font-size: 0.8125rem;
  line-height: normal;
  text-align: center;
}
.canvasHead > .appButton {
  flex: 0 0 auto;
}
.canvasHead__libraryButton {
  flex: 0 0 auto;
}
.canvasActions {
  flex: 0 0 auto;
  margin-left: auto;
  color: #606692;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.canvasActions__zoom {
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #606692;
}
.canvasActions__zoom svg {
  width: 1rem;
  height: 1rem;
}
.canvasActions__zoom:hover:not(:disabled) {
  background: #eff2fa;
  color: #2e3567;
}
.canvasActions__zoom:focus-visible {
  outline: 2px solid #f2bb00;
  outline-offset: 2px;
}
.canvasActions__zoom:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
.canvasActions__value {
  min-width: 2rem;
  color: #606692;
  font-size: 0.8125rem;
  line-height: normal;
  text-align: center;
}
.canvas {
  flex: 1;
  background: #eff2fa;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.625rem;
}
// 三處縮圖（來源／原圖比對／主畫布）共用：選了真的素材（有 url）就鋪滿容器、
// 蓋掉裁切／填滿都用 cover；沒有 url（demo 素材、mock 資料）時模板會退回
// IconImagePlaceholder，這顆 class 不會被用到。
.editorSourceImg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.artboard {
  width: min(32.5rem, calc(100% - 2rem));
  height: auto;
  aspect-ratio: 4 / 3;
  background: white;
  border: 1px solid #d2d5dd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: #aab8d0;
  font-size: 2.75rem;
  transform-origin: center;
  transition: transform 160ms ease;
}
.canvasEmpty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;

  &__hint {
    color: #aab8d0;
    font-size: 0.875rem;
    font-weight: 400;
    text-align: center;
  }
}
.artboard.cropping {
  overflow: hidden;

  .textObject,
  .objectObject {
    pointer-events: none;
  }
}
// 使用者反饋：固定比例拖曳縮放時也要跟自訂裁切一樣有虛線框＋灰底變暗遮罩，
// 不要只有四個角落把手浮在乾淨畫面上——兩種模式的視覺一致，才看得出目前在調整取景範圍。
.cropFrame {
  position: absolute;
  z-index: 100;
  border: 2px dashed #2e3567;
  box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.32);
  cursor: grab;
  touch-action: none;

  &.isDragging {
    cursor: grabbing;
  }
}
.cropHandle {
  position: absolute;
  width: 0.625rem;
  height: 0.625rem;
  border: 2px solid #2e3567;
  border-radius: 2px;
  background: #fff;
  padding: 0;
  touch-action: none;

  &--nw {
    top: -0.375rem;
    left: -0.375rem;
    cursor: nwse-resize;
  }

  &--ne {
    top: -0.375rem;
    right: -0.375rem;
    cursor: nesw-resize;
  }

  &--sw {
    bottom: -0.375rem;
    left: -0.375rem;
    cursor: nesw-resize;
  }

  &--se {
    right: -0.375rem;
    bottom: -0.375rem;
    cursor: nwse-resize;
  }

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}
// 對齊 Figma（1141:1140 selection_marquee）：選取範圍要有淡淡的藍色底色 rgba(46,53,103,0.1)
// 才看得出框選了哪塊區域，原本沒有底色，只有虛線框；圓角也應該是 6px，原本是 4px。
// z-index 壓在所有圖層（layerZIndex ≥ 2）之下：原本 100 會蓋住置中加入的圖庫物件，從物件中心
// 拖曳完全不動、只有抓框外才拖得動。現在最上層可見者接到 pointer——物件蓋到的地方拖物件，
// 框選區其餘部分仍可拖曳，AI 生成流程的框選不受影響。
.objectSelection {
  position: absolute;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border: 2px dashed $blue-dark-500;
  border-radius: 6px;
  background: rgba(46, 53, 103, 0.1);
  cursor: grab;
  touch-action: none;

  &.isDragging {
    cursor: grabbing;
  }
}
.objectSelection__handle {
  position: absolute;
  width: 0.625rem;
  height: 0.625rem;
  border: 2px solid $blue-dark-500;
  border-radius: 2px;
  background: #fff;
  pointer-events: none;

  &--nw {
    top: -0.375rem;
    left: -0.375rem;
  }

  &--ne {
    top: -0.375rem;
    right: -0.375rem;
  }

  &--sw {
    bottom: -0.375rem;
    left: -0.375rem;
  }

  &--se {
    right: -0.375rem;
    bottom: -0.375rem;
  }
}
// 對齊 Figma（1141:1145 selection_tip）：圓角 6px（不是藥丸形的 12px）、上下內距 6px
// （原本 4px）、文字 11px Medium（原本 12px、沒有加粗）。
.objectSelection__tip {
  position: relative;
  bottom: -0.75rem;
  border-radius: 6px;
  background: $blue-dark-500;
  padding: 0.375rem 0.625rem;
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 500;
  white-space: nowrap;
}
.cropAppliedBadge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 100;
  border-radius: 12px;
  background: rgba(46, 53, 103, 0.85);
  padding: 0.25rem 0.625rem;
  color: #fff;
  font-size: 0.75rem;
}
.cropAppliedActions {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
}
.removeOverlay {
  position: absolute;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem; // 對齊 Figma node 1311:1042 的 12px 間距，原本 6px 太擠
  background: rgba(255, 255, 255, 0.96); // 對齊 Figma，原本 0.92 偏透明
  border-radius: 4px; // 與 .artboard 同角度，避免方角蓋住外層圓角邊框
  text-align: center;

  strong {
    color: #2e3567;
    font-size: 0.9375rem;
  }

  small {
    color: #606692; // 對齊 Figma node 1311:1047，原本 #9299aa 太淺
    font-size: 0.75rem;
  }
}
.removeOverlay__spinner {
  width: 2.5rem; // 對齊 Figma 40x40，原本 2rem(32px)偏小
  height: 2.5rem;
  color: $blue-dark-500;
  animation: editorSpin 0.9s linear infinite;
}
.retouchProgress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 1rem;
  text-align: center;

  strong {
    color: #2e3567;
    font-size: 0.9375rem;
  }

  small {
    color: #9299aa;
    font-size: 0.75rem;
  }
}
.retouchProgress__spinner {
  width: 1.75rem;
  height: 1.75rem;
  color: $blue-dark-500;
  animation: editorSpin 0.9s linear infinite;
}
.retouchProgress__bar {
  width: 8rem;
  height: 0.375rem;
  border-radius: 0.1875rem;
  background: #eff2fa; // 對齊 Figma node 1311:820 的軌道色，不是既有的 #d2d5dd
  overflow: hidden;
}
.retouchProgress__fill {
  height: 100%;
  border-radius: inherit;
  background: $blue-dark-500;
  transition: width 0.2s ease;
}
.compare__thumb.isLoading {
  background: #fff;
}
@keyframes editorSpin {
  to {
    transform: rotate(1turn);
  }
}
.textObject__content {
  display: block;
  min-width: 1ch;

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}
.textObject {
  position: absolute;
  transform: translate(-50%, -50%);
  border: 1px dashed #2e3567;
  padding: 0.375rem 0.625rem;
  color: #2e3567;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &.isDragging {
    cursor: grabbing;
  }

  &.isEditing {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
    cursor: text;
    touch-action: auto;
    user-select: text;
  }

  &.isCropPreview {
    border-color: transparent;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}
.textResizeHandle {
  position: absolute;
  width: 0.625rem;
  height: 0.625rem;
  border: 1px solid #2e3567;
  border-radius: 2px;
  background: #fff;
  padding: 0;
  touch-action: none;

  &--nw {
    top: -0.375rem;
    left: -0.375rem;
    cursor: nwse-resize;
  }

  &--ne {
    top: -0.375rem;
    right: -0.375rem;
    cursor: nesw-resize;
  }

  &--sw {
    bottom: -0.375rem;
    left: -0.375rem;
    cursor: nesw-resize;
  }

  &--se {
    right: -0.375rem;
    bottom: -0.375rem;
    cursor: nwse-resize;
  }

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}
.objectObject {
  position: absolute;
  display: flex;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: #eef1f7;
  color: #aeb8cc;
  cursor: grab;
  touch-action: none;
  user-select: none;

  > svg {
    width: 35%;
    height: 35%;
  }

  &.isSelected {
    border-style: dashed;
    border-color: #2e3567;
  }

  &.isDragging {
    cursor: grabbing;
  }

  &.isCropPreview {
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }

  // 圖庫選來的物件：高度跟著圖片等比，不再是佔位用的正方形灰底
  &.hasImage {
    aspect-ratio: auto;
    background: transparent;
  }

  &__img {
    display: block;
    width: 100%;
    height: auto;
    pointer-events: none;
  }
}
.objectResizeHandle {
  position: absolute;
  width: 0.625rem;
  height: 0.625rem;
  padding: 0;
  border: 1px solid #2e3567;
  border-radius: 2px;
  background: #fff;
  touch-action: none;

  &--nw {
    top: -0.375rem;
    left: -0.375rem;
    cursor: nwse-resize;
  }

  &--ne {
    top: -0.375rem;
    right: -0.375rem;
    cursor: nesw-resize;
  }

  &--sw {
    bottom: -0.375rem;
    left: -0.375rem;
    cursor: nesw-resize;
  }

  &--se {
    right: -0.375rem;
    bottom: -0.375rem;
    cursor: nwse-resize;
  }

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}
.canvas p {
  flex-shrink: 0;
  font-size: 0.725rem;
  color: #b4b9c4;
  text-align: center;
  transition: margin-top 160ms ease;
}
.canvasFoot {
  min-height: 2.375rem;
  height: auto;
  flex-shrink: 0;
  margin: 0;
  background: #fff;
  padding: 0.625rem 1rem 0.875rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: #606692;
}
.layers h3,
.cropPanel h3 {
  min-height: 2.875rem;
  font-size: 0.9375rem;
  line-height: 1.375rem;
  color: #2e3567;
  padding: 0.75rem 1rem;
}
.layers h3 button {
  float: right;
  font-size: 1.25rem;
}
.cropPanel h3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cropReset {
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  color: #a5c8e6;

  svg {
    width: 1rem;
    height: 1rem;
  }

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}
.layer {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  min-height: 2.875rem;
  padding: 0.5rem 1.5rem;
  font-size: 0.8125rem;
  border-bottom: 1px solid #eff2fa;
}
.layer.isSelected {
  background: #eff2fa;
  box-shadow: inset 3px 0 #2e3567;
}
.layer.isDragging {
  opacity: 0.45;
}
.layer.isDropTarget {
  box-shadow: inset 0 2px #f2bb00;
}
.layer svg {
  font-size: 1.25rem;
  color: #a5c8e6;
}

.layer__select {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 0.4375rem;
  padding: 0;
  text-align: left;

  &:focus-visible {
    border-radius: 0.25rem;
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}

.layer__thumbnail {
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
}

.layer__copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
  color: #2e3567;
  font-weight: 500;
  line-height: normal;

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: #b4b9c4;
    font-size: 0.6875rem;
    font-weight: 400;
  }
}

.layer__lock {
  flex-shrink: 0;
  min-height: 1.5rem;
  padding: 0.1875rem 0.75rem;
  border: 1px solid #d2d5dd;
  border-radius: 1rem;
  background: #fff;
  color: #606692;
  font-size: 0.8125rem;
  line-height: normal;

  &:hover {
    border-color: #606692;
  }

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}

.layer:has(.layer__lock) :deep(.appCheckbox__input:disabled + .appCheckbox__box) {
  opacity: 1;
}

.layer__sort {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
}
.layer__sortButton {
  display: flex;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 2.75rem;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: grab;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  &:focus-visible {
    border-radius: 0.375rem;
    outline: 2px solid #f2bb00;
    outline-offset: 1px;
  }
}

.isUp {
  transform: rotate(180deg);
}
.properties,
.editorError {
  margin: 0;
  color: #d93e28;
  font-size: 0.75rem;
  line-height: 1rem;
}
// 對齊 Figma（1157:619 props）：面板本身要有 16px 內距、上方要有一條分隔線，
// 跟 .aiCost／.objectGenerator 同一組樣式規則，原本漏掉造成內容貼齊面板邊界。
// 原本 top 沒補（padding: 0 1rem 1rem），標題會貼齊分隔線；Figma 量出來上方同樣要留 16px。
.properties {
  border-top: 1px solid #d2d5dd;
  padding: 1rem;
}
// 對齊 Figma（1311:887 ai_cost）：上方 padding 應為 14px，原本漏寫成 0，
// 導致標題貼齊上方分隔線；左右／下方的 16px 維持不變。
.aiCost {
  border-top: 1px solid #d2d5dd;
  padding: 0.875rem 1rem 1rem;
}
// 對齊 Figma（1141:952 props_object）：六個子項目（標題／描述框／字數／預設列／提示文字／
// 按鈕）之間統一是 10px 間距，原本用 8px。
.objectGenerator {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  border-top: 1px solid #d2d5dd;
  padding: 1rem;
}
.objectGenerator__desc {
  width: 100%;
  min-height: 4.5rem;
  border: 1px solid #d2d5dd;
  border-radius: 18px;
  padding: 0.5rem 0.875rem;
  color: #383c4b;
  font-size: 0.875rem;
  line-height: normal;
  resize: vertical;

  &::placeholder {
    color: #b4b9c4;
    opacity: 1;
  }
}
// .charCounter 共用樣式帶了 -0.75rem 的 margin-top（修圖面板用來把字數貼近文字框，
// 抵掉一部分外層 1rem 的 gap）。但這裡父層 .objectGenerator 的 gap 只有 0.625rem，
// 兩者疊加會變成負值，字數會整個往上貼到描述框裡；Figma（1141:952）這幾個子項目本來
// 就是統一的 10px 間距，不需要額外拉近，所以把 margin 歸零。
.objectGenerator .charCounter {
  margin-top: 0;
}
// 對齊 Figma（1142:800 row_obj_presets）：這裡的預設 chips 間距是 6px，比 .presetRow
// 共用的 8px（修圖常用指令列用）窄；父層 .objectGenerator 已經用 flex gap 統一控制上下間距，
// 所以額外把 .presetRow 自己的 margin 歸零，避免疊加。
.objectGenerator .presetRow {
  gap: 0.375rem;
  margin: 0;
}
// 對齊 Figma（1142:812）：提示文字顏色是 #b4b9c4，原本用了更深的 #9299aa。
.objectGenerator__hint {
  color: #b4b9c4;
  font-size: 0.6875rem;
  line-height: 1rem;
}
// 這三個 h3 都是 aside.layers 底下的子面板標題，會被 `.layers h3` 那條規則（min-height
// 2.875rem + padding 0.75rem 1rem）用後代選擇器一起吃到，之前只清掉了 padding-left，
// 上下 12px padding 跟 46px 最小高度還在，導致標題底下多出比設計稿多的空白——這三個
// 面板本來就各自管理自己的內距（見上面 .properties／.aiCost／.objectGenerator 的規則），
// 標題文字本身在 Figma 裡沒有額外的內距，全部歸零讓面板自己的 gap／padding 說了算。
.properties h3,
.aiCost h3,
.objectGenerator h3 {
  min-height: 0;
  padding: 0;
}
// 對齊 Figma（1142:795）：「加入物件」標題是 13px Bold、正常行高，不是繼承 .layers h3
// 的 15px／1.375rem 行高（後者會讓文字框比實際文字高出一截，變相多出上下空間）。
.objectGenerator h3 {
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: normal;
}
// 對齊 Figma（1157:619／1157:620）：「文字屬性」標題是 13px Bold、正常行高，同樣不是
// 繼承 .layers h3 的 15px／1.375rem 行高；標題底下要留 10px 才接到輸入框，原本沒補
// margin，兩者會直接貼在一起。
.properties h3 {
  margin: 0 0 0.625rem;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: normal;
}
.properties__text,
.fontSelect__trigger {
  width: 100%;
  border: 1px solid #d2d5dd;
  border-radius: 1.125rem;
  background: #fff;
  font-size: 0.875rem;
}
.properties__text {
  height: 2.25rem;
  padding: 0.5rem 0.875rem;
  color: #2e3567;
}
.fontRow {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.625rem 0;
}
.fontSelect {
  position: relative;
  min-width: 0;
  flex: 1;
}
.fontSelect__trigger {
  display: flex;
  height: 2.25rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.375rem;
  padding: 0.4375rem 0.75rem 0.4375rem 0.875rem;
  color: #383c4b;
  font-family: inherit;
  line-height: normal;
  cursor: pointer;

  // dropdown state=default 框線 #d2d5dd（由 .properties__text 共用規則帶入）、
  // state=active 框線 #2e3567（Figma node 1157:623）
  &.isOpen {
    border-color: #2e3567;
  }

  svg {
    width: 0.75rem;
    height: 0.75rem;
    flex: none;
    color: #383c4b;
    pointer-events: none;
    transition: transform 0.15s ease;
  }

  svg.isUp {
    transform: rotate(180deg);
  }

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}
.fontSelect__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fontMenu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.25rem);
  left: 0;
  width: 18rem;
  border: 1px solid #d2d5dd;
  border-radius: 0.625rem;
  background: #fff;
  box-shadow: 0 0.5rem 0.75rem rgba(0, 0, 0, 0.16);
}
.fontMenu__scroll {
  position: relative;
}
.fontMenu__list {
  display: flex;
  height: 17.875rem;
  flex-direction: column;
  padding: 0.5rem;
  gap: 0.125rem;
  overflow-x: hidden;
  overflow-y: auto;
}
.fontMenu__group {
  color: #b4b9c4;
  font-size: 0.625rem;
  font-weight: 500;
  line-height: normal;
}
.fontMenu__item {
  display: flex;
  align-items: center;
  padding: 0.4375rem 0.625rem;
  border: 0;
  border-radius: 0.375rem;
  margin: 0;
  background: transparent;
  cursor: pointer;
  gap: 0.5rem;
  text-align: left;

  &.isSelected {
    background: #eff2fa;
  }

  &:hover:not(.isSelected) {
    background: #f7f8fc;
  }

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: -2px;
  }
}
.fontMenu__col {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.0625rem;
}
.fontMenu__name {
  overflow: hidden;
  color: #2e3567;
  font-size: 0.75rem;
  font-weight: 400;
  line-height: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fontMenu__item.isSelected .fontMenu__name {
  font-weight: 500;
}
.fontMenu__desc {
  color: #b4b9c4;
  font-size: 0.625rem;
  font-weight: 400;
  line-height: normal;
}
.fontMenu__check {
  width: 0.875rem;
  height: 0.875rem;
  flex: none;
}
.fontMenu__fade {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1.375rem;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), #fff);
  pointer-events: none;
}
.fontMenu__note {
  display: flex;
  flex-direction: column;
  padding: 0.625rem 0.75rem 0.75rem;
  border-top: 1px solid #d2d5dd;
  gap: 0.1875rem;
  font-size: 0.625rem;
  line-height: normal;
}
.fontMenu__noteMain {
  color: #606692;
}
.fontMenu__noteSub {
  color: #b4b9c4;
}
.colorPicker {
  position: relative;
  width: 3rem;
  height: 3rem;
  flex: 0 0 3rem;
  overflow: hidden;
  border: 1px solid #eff2fa;
  border-radius: 0.5rem;
  background: var(--selected-color);
  cursor: pointer;

  input {
    position: absolute;
    inset: -0.5rem;
    width: calc(100% + 1rem);
    height: calc(100% + 1rem);
    opacity: 0;
    cursor: pointer;
  }

  &:focus-within {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}
.properties small,
.aiCost small {
  font-size: 0.6875rem;
  color: #b4b9c4;
}
.properties__settings {
  display: block;
  color: #606692 !important;
  font-family: 'Noto Sans TC', sans-serif;
  font-size: 0.75rem !important;
  font-weight: 400;
  line-height: normal;
  white-space: nowrap;
}
.aiCost__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin: 0.5rem 0;
  color: #606692;
  font-size: 0.75rem;
  line-height: normal;
}
.aiCost__row--total {
  color: #2e3567;
  font-weight: 500;
}
.aiCost__amount {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #ea903a;

  b {
    color: inherit;
    font-weight: inherit;
  }
}
.aiCost__feedBtn {
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  color: inherit;
  cursor: pointer;
  line-height: 0;
}
.aiCost__amount--item {
  font-size: 0.75rem;
  font-weight: 500;

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }
}
.aiCost__amount--total {
  font-size: 0.875rem;
  font-weight: 700;

  svg {
    width: 1rem;
    height: 1rem;
  }
}
.aiCost__note {
  display: block;
  width: 100%;
  line-height: normal;
  overflow-wrap: anywhere;
}
.cropPanel {
  padding-bottom: 0.75rem;
}
.cropPanel .ratioRow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  min-height: 1.8125rem;
  align-items: center;
  padding: 0 1rem;
}
.ratioRow button,
.custom {
  border: 1px solid #d2d5dd;
  border-radius: 15px;
  min-height: 1.8125rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.8125rem;
}
.ratioRow button.active {
  border-color: #606692;
  color: #2e3567;
}
// 對齊 Figma（606:870 row_ratio）：比例列跟「自訂」只隔 8px，原本 .ratioRow 被塞了
// 整個 row_ratio 的高度（66px）卻只放第一排按鈕，單行內容貼齊頂部，底下多出約 37px
// 空白才接到「自訂」，看起來上下兩排間距過大；改成貼合內容高度 + 0.5rem 的上邊距。
// 下方不留 margin——「自訂」跟下面尺寸文字之間的 12px 由 .cropPanel > p 自己的
// padding-top 負責，避免兩邊都留間距疊加成 20px。
.custom {
  margin: 0.5rem 1rem 0;
}
.custom.active {
  border-color: #606692;
  color: #2e3567;
  font-weight: 500;
}
// 對齊 Figma（606:883 row_size ／ 1144:630 row_size）：這段文字跟上方比例列要留 12px，
// 跟下方分隔線只留 4px，原本完全沒有上下內距，貼著上下兩個區塊。
.cropPanel > p {
  font-size: 0.75rem;
  color: #606692;
  padding: 0.75rem 1rem 0.25rem;
}
// 對齊 Figma（606:885 divider）：「各通路預覽」標題上方要有一條 1px 分隔線，
// 跟上面「寬 1080px・高 1080px・旋轉 0°」資訊分開，原本兩個 h3 共用同一組樣式，漏掉這條線。
.channelPreviewsTitle {
  border-top: 1px solid #d2d5dd;
}
.previews {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem 0.75rem;
  min-height: 20.25rem;
  padding: 0 1rem;
}
.preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.6875rem;
}
// 對齊 Figma（606:898 cap 標題文字）：通路名稱字色應為 #2e3567，
// 原本沒有單獨設定，繼承 .workspace 的 #383c4b，跟其他標題深藍色不一致。
.preview strong {
  color: #2e3567;
}
.preview__thumb {
  height: 7.5rem;
  background: #eff2fa;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aab8d0;
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}
.preview__thumb svg {
  width: 2.75rem;
  height: 2.75rem;
}
.preview__thumb.square {
  width: 7.5rem;
}
.preview__thumb.portrait {
  width: 4.25rem;
}
.preview__thumb.fourFive {
  width: 5.75rem;
}
// 對齊 Figma（606:922 cell_LINE 圖文）：16:9 縮圖比其他三個通路矮，應該在同高的格子裡
// 上下置中（各留 1.625rem），原本把整段落差都塞在 margin-top，縮圖會貼底而不是置中。
.preview__thumb.wide {
  width: 7.5rem;
  height: 4.25rem;
  margin-top: 1.625rem;
  margin-bottom: 1.875rem;
}
.preview small {
  color: #b4b9c4;
}
.preview small.warn {
  color: #ea903a;
}
// 對齊 Figma（1144:641）：「完整呈現」要用綠色 #54c14f 標示，原本跟「上下留白」
// 共用預設的灰色，看不出這個通路是完全符合比例、不需要留白或裁切。
.preview small.full {
  color: #54c14f;
}
.cropNote {
  margin-top: 0.75rem !important;
  color: #b4b9c4 !important;
}
.workspace.isRetouch {
  grid-template-columns: minmax(20rem, 25rem) minmax(0, 1fr);
}
.retouchToggle {
  display: none;
}
.retouchPanel {
  // 明確加 min-height:0：.retouchPanel 是 .workspace（CSS Grid）裡的一個 grid item，
  // 「快速修飾」選項變多時內容變高，沒有這行的話這個 cell 可能撐高整個 grid row，
  // 而不是縮到 row 原本的高度、靠自己的 overflow-y:auto 在內部捲動（配上面
  // scrollbar-width:none 隱藏捲軸，讓使用者看不出來在捲）。撐高的話，「整個頁面」
  // 會跟著變長，逼出 DefaultLayout .content 那層的瀏覽器原生捲軸，跑到畫面最右邊。
  min-height: 0;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  scrollbar-width: none;
}
.retouchPanel::-webkit-scrollbar {
  display: none;
}
.retouchPanel h3 {
  font-size: 0.875rem;
  line-height: normal;
  color: #2e3567;
  font-weight: 700;
}
.sourceThumb {
  height: 10.625rem;
  flex: 0 0 10.625rem;
  background: #eff2fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aab8d0;
}
.sourceThumb svg {
  width: 2.75rem;
  height: 2.75rem;
}
.sourceActions {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.uploadTip {
  font-size: 0.75rem;
  line-height: normal;
  color: #b4b9c4;
}
.methodRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.method {
  border: 1px solid #d2d5dd;
  border-radius: 8px;
  min-height: 3.75rem;
  padding: 0.625rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
  background: #fff;
}
.method strong {
  color: #383c4b;
  font-size: 1rem;
  line-height: 1.375rem;
}
// 對齊 Figma（608:5370 row_mode）：選中的修圖方式除了框線變色，
// 底色要換成 #eff2fa、框線加粗到 1.5px、標題文字也要變成 #2e3567。
.method.active {
  border: 1.5px solid #2e3567;
  background: #eff2fa;
}
.method.active strong {
  color: #2e3567;
}
.method small,
.option small {
  font-size: 0.6875rem;
  color: #b4b9c4;
}
.method small {
  color: #606692;
  font-size: 0.75rem;
  line-height: 1rem;
}
.optionSectionHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.optionDisclosure {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0;
  border: 0;
  background: transparent;
  color: #606692;
  font-size: 0.75rem;
  line-height: 1;

  svg {
    width: 0.875rem;
    height: 0.875rem;
    transition: transform 160ms ease;
  }

  svg.isUp {
    transform: rotate(180deg);
  }
}
.optionalOptionsHint {
  margin-top: -0.625rem;
  color: #9299aa;
  font-size: 0.6875rem;
  line-height: 1.25rem;
}
.commandBaseCost {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 3rem;
  padding: 0.5rem 0.625rem;
  border-radius: 8px;
  background: #eff2fa;

  > span:first-child {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  strong {
    color: #2e3567;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  small {
    color: #9299aa;
    font-size: 0.6875rem;
    line-height: 1rem;
  }
}
.optionList {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.presetRow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0;
}
// 對齊 Figma（1140:768 row_presets／1142:800 row_obj_presets）：兩處的 chip 樣式其實共用
// 同一組規格——18px 圓角、文字 #383c4b、14px，原本用了 14px 圓角、#606692、13px。
.presetChip {
  border: 1px solid #d2d5dd;
  border-radius: 18px;
  background: #fff;
  padding: 0.375rem 0.75rem;
  color: #383c4b;
  font-size: 0.875rem;
  transition:
    border-color 0.15s,
    color 0.15s,
    background-color 0.15s;

  &:hover {
    border-color: $blue-dark-500;
    color: $blue-dark-500;
  }
}
.option {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 3rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid #d2d5dd;
  border-radius: 8px;
  background: #fff;
  font-size: 0.8125rem;
}
.option.isSelected {
  border-color: transparent;
  background: #eff2fa;
}
.option__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
  line-height: normal;
}
.option__copy strong {
  color: #2e3567;
  font-weight: 500;
}
.option__cost {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
  color: #ea903a;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: normal;

  svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  b {
    font-weight: inherit;
  }
}
.option__cost.free {
  color: #54c14f;
}
.retouchPanel textarea {
  height: 4.75rem;
  min-height: 4.75rem;
  border: 1px solid #d2d5dd;
  border-radius: 18px;
  padding: 0.5rem 0.875rem;
  color: #383c4b;
  font-size: 0.875rem;
  line-height: normal;
  resize: vertical;
}
.retouchPanel textarea::placeholder {
  color: #b4b9c4;
  opacity: 1;
}
.charCounter {
  margin-top: -0.75rem;
  color: #b4b9c4;
  font-size: 0.75rem;
  line-height: normal;
}
.panelAction {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #d2d5dd;
  position: sticky;
  bottom: -1.5rem;
  z-index: 1;
  min-height: 4.875rem;
  margin: 0 -1.5rem -1.5rem;
  padding: 1rem 1.5rem;
  background: white;
  font-size: 0.8125rem;
}
.panelAction b {
  color: #2e3567;
}
.resultPanel {
  display: flex;
  flex-direction: column;
}
.resultHead span {
  margin-left: auto;
  color: #606692;
  font-size: 0.75rem;
}
.resultHead {
  min-height: 2.875rem;
  padding: 0.875rem 1.25rem;
  line-height: normal;
}
.resultHead strong {
  color: #2e3567;
  font-size: 0.9375rem;
  font-weight: 700;
}
.resultHead span {
  font-size: 0.75rem;
  font-weight: 400;
  white-space: nowrap;
}
.compare {
  flex: 1;
  background: #eff2fa;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.25rem;
}
.compare__item {
  display: flex;
  width: 17.5rem;
  max-width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #b4b9c4;
  min-width: 0;
  flex: 0 1 17.5rem;
}
.compare__item > span {
  border: 1px solid #d2d5dd;
  border-radius: 14px;
  padding: 0.1875rem 0.75rem;
  color: #606692;
}
.compare__item > span.active {
  background: #2e3567;
  color: white;
}
.compare__thumb {
  width: min(100%, 17.5rem);
  height: auto;
  aspect-ratio: 14 / 17;
  border: 1px solid #d2d5dd;
  background: #eef1f7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.875rem;
  color: #aab8d0;
}
.resultActions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 4.25rem;
  padding: 1rem;
  font-size: 0.75rem;
  color: #606692;
}
.resultActions span {
  margin-right: auto;
}

@media (min-width: 64.0625rem) {
  .compare__item {
    width: clamp(17.5rem, 20vw, 23.75rem);
    flex-basis: clamp(17.5rem, 20vw, 23.75rem);
  }

  .compare__thumb {
    width: 100%;
    max-width: 23.75rem;
  }
}

@include below($bp-lg) {
  .workspace {
    grid-template-columns: 4rem minmax(0, 1fr) 16rem;
  }
  .workspace.isRetouch {
    grid-template-columns: minmax(18rem, 20rem) minmax(0, 1fr);
  }
  .canvasHead {
    height: auto;
    min-height: 2.75rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
  .canvasHead strong {
    grid-column: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .canvasHead > span {
    grid-column: 2;
  }
  .canvasHead__libraryButton {
    grid-column: 1;
    width: 100%;
  }
  .canvasActions {
    grid-column: 2;
    justify-self: end;
  }
  .canvasHead > .appButton:last-child {
    grid-column: 1 / -1;
    width: 100%;
  }
  .cropPanel .ratioRow {
    min-height: auto;
    padding-block: 0.75rem;
  }
  .resultActions {
    flex-wrap: wrap;

    span {
      flex: 1 0 100%;
    }

    button {
      flex: 1 1 7rem;
    }
  }
  .artboard {
    width: min(32.5rem, calc(100% - 2rem));
    height: auto;
    aspect-ratio: 4 / 3;
  }
  .artboard.cropping {
    width: min(32.5rem, calc(100% - 2rem));
    aspect-ratio: 4 / 3;
  }
}

@media (max-width: 80rem) and (min-width: 64.0625rem) {
  .canvasHead {
    height: auto;
    min-height: 3.75rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .canvasHead strong {
    grid-column: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .canvasHead > span {
    grid-column: 2;
  }

  .canvasHead__libraryButton {
    grid-column: 1;
    width: 100%;
  }

  .canvasActions {
    grid-column: 2;
    justify-self: end;
  }

  .canvasHead > .appButton:last-child {
    grid-column: 1 / -1;
    width: 100%;
  }

  .workspace.isRetouch {
    grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
  }

  .compare {
    padding-inline: 1rem;
  }

  .resultActions {
    flex-wrap: wrap;

    span {
      flex: 1 0 100%;
    }

    button {
      flex: 1 1 7rem;
    }
  }
}

@include below($bp-sm) {
  .workspace,
  .workspace.isRetouch {
    grid-template-columns: minmax(0, 1fr);
    flex: none;
    min-height: auto;
  }

  .tools {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.25rem;
    overflow: visible;
    padding: 0.5rem;
  }
  .tool {
    width: 100%;
    min-width: 0;
    height: 5rem;
    min-height: 5rem;
    padding: 0.5rem 0.125rem;
  }
  .tool:first-child {
    height: 5rem;
  }
  .tool svg {
    width: 1.5rem;
    height: 1.5rem;
  }
  .tool .tool__cost svg {
    width: 0.625rem;
    height: 0.625rem;
  }

  .canvasPanel {
    min-height: 30rem;
  }
  .canvasHead {
    height: auto;
    min-height: 2.75rem;
    grid-template-areas:
      'name status'
      'library zoom'
      'save save';
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem 0.625rem;
    padding: 0.75rem 0.875rem;
  }
  .canvasHead strong {
    grid-area: name;
  }
  .canvasHead > span {
    grid-area: status;
    justify-self: end;
  }
  .canvasHead__libraryButton {
    grid-area: library;
    width: 100%;
    min-width: 0;
  }
  .canvasActions {
    grid-area: zoom;
    justify-self: end;
  }
  .canvasHead > .appButton:last-child {
    grid-area: save;
    width: 100%;
    flex: 1 0 100%;
  }
  .canvas {
    min-height: 22rem;
    padding: 1rem;
  }
  .artboard,
  .artboard.cropping {
    width: 100%;
    max-width: 24.375rem;
    height: auto;
    aspect-ratio: 4 / 3;
  }
  .artboard.cropping {
    max-width: 24.375rem;
  }
  .canvasFoot {
    height: auto;
    min-height: 1.75rem;
  }

  .retouchPanel,
  .resultPanel {
    min-width: 0;
  }
  .retouchToggle {
    @include flex(space-between, center, 0.75rem);
    width: 100%;
    min-height: 2.75rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid $blue-dark-500;
    border-radius: 10px;
    background: $white;
    color: $blue-dark-500;
    font-size: 0.875rem;
    font-weight: 700;
    box-shadow: $boxShadowDark;
  }
  .retouchPanel {
    display: none;
    &.isMobileOpen {
      display: flex;
    }
  }
  .compare {
    flex: none;
    flex-direction: column;
    padding: 1rem;
  }
  .compare__item {
    width: 100%;
  }
  .compare__thumb {
    width: 100%;
    max-width: 13.125rem;
    height: auto;
    aspect-ratio: 210 / 255;
  }
  .resultActions {
    flex-wrap: wrap;
    button {
      flex: 1 1 8rem;
    }
    span {
      flex: 1 0 100%;
    }
  }
}
</style>
