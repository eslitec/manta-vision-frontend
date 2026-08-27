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
      .sourceThumb: IconImagePlaceholder
      .sourceActions
        AppButton(variant="outline" @click="openEditorPicker('source')") {{ t('common.selectFromLibrary') }}
        span.uploadTip {{ t('common.orDragUpload') }}
      h3 {{ t('editor.retouch.steps.method') }}
      .methodRow
        button.method(type="button" :class="{ active: retouchMethod === 'quick' }" :aria-pressed="retouchMethod === 'quick'" @click="setRetouchMethod('quick')") #[strong {{ t('editor.retouch.quick') }}] #[small {{ t('editor.retouch.quickHint') }}]
        button.method(type="button" :class="{ active: retouchMethod === 'command' }" :aria-pressed="retouchMethod === 'command'" @click="setRetouchMethod('command')") #[strong {{ t('editor.retouch.command') }}] #[small {{ t('editor.retouch.commandHint') }}]
      .commandBaseCost(v-if="retouchMethod === 'command'")
        span
          strong {{ t('editor.retouch.commandBaseCost') }}
          small {{ t('editor.retouch.commandBaseCostHint') }}
        span.option__cost
          IconFeedBottleSmall
          b {{ t('editor.feedShort', { count: commandRetouchBaseCost }) }}
      .optionSectionHead
        h3 {{ retouchMethod === 'command' ? t('editor.retouch.steps.optionalOptions') : t('editor.retouch.steps.options') }}
        button.optionDisclosure(
          v-if="retouchMethod === 'command'"
          type="button"
          :aria-expanded="retouchOptionsOpen"
          aria-controls="retouch-options"
          @click="retouchOptionsOpen = !retouchOptionsOpen"
        )
          span {{ t(retouchOptionsOpen ? 'editor.retouch.hideOptions' : 'editor.retouch.showOptions') }}
          IconChevronDown(:class="{ isUp: retouchOptionsOpen }")
      small.optionalOptionsHint(v-if="retouchMethod === 'command'") {{ t('editor.retouch.optionalOptionsHint') }}
      #retouch-options.optionList(v-show="retouchOptionsOpen")
        label.option(v-for="o in retouchOptionsForMethod" :key="o.key" :class="{ isSelected: o.on }")
          AppCheckbox(v-model="o.on" :label="t(`editor.retouch.options.${o.key}.name`)")
          span.option__copy #[strong {{ t(`editor.retouch.options.${o.key}.name`) }}] #[small {{ t(`editor.retouch.options.${o.key}.hint`) }}]
          span.option__cost(:class="{ free: o.free }")
            IconFeedBottleSmall(v-if="!o.free")
            b {{ o.free ? t('editor.free') : t('editor.feedShort', { count: o.cost }) }}
      template(v-if="retouchMethod === 'command'")
        h3 {{ t('editor.retouch.steps.requiredInstruction') }}
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
        .compare__item #[span {{ t('editor.original') }}] #[.compare__thumb: IconImagePlaceholder] #[small {{ t('editor.uploadedDate') }}]
        .compare__item #[span.active {{ t('editor.afterRetouch') }}] #[.compare__thumb: IconImagePlaceholder] #[small {{ t('editor.consumed', { count: lastRetouchCost }) }}]
      footer.resultActions
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
        :disabled="applyingTool === 'remove'"
        @click="selectRemoveTool"
      )
        IconAiSparkle
        span {{ t('editor.tools.remove') }}
        small.tool__cost(v-if="removeToolCost")
          IconFeedBottleSmall
          | {{ removeToolCost }}
      button.tool.tool--object(:class="{active: tool==='object'}" :aria-pressed="tool === 'object'" @click="openObjectPicker") #[IconAddObject] #[span {{ t('editor.tools.object') }}]
      button.tool(:class="{active: tool==='fade'}" :aria-pressed="tool === 'fade'" @click="tool='fade'") #[IconImagePlaceholder] #[span {{ t('editor.tools.fade') }}]
      button.tool(:class="{active: tool==='text'}" :aria-pressed="tool === 'text'" @click="insertTextLayer") #[IconTextDocument] #[span {{ t('editor.tools.text') }}]
      button.tool(:class="{active: tool==='crop'}" :aria-pressed="tool === 'crop'" @click="tool='crop'") #[IconEdit] #[span {{ t('editor.tools.crop') }}]
    section.canvasPanel
      header.canvasHead
        strong #[IconImagePlaceholder] {{ selectedAssetName }}
        span {{ t('editor.status', { status: tool === 'crop' ? t('editor.cropping') : t('editor.edited') }) }}
        AppButton.canvasHead__libraryButton(variant="outline" @click="openEditorPicker('source')") {{ t('common.selectFromLibrary') }}
        .canvasActions
          button.canvasActions__zoom(type="button" :disabled="!canZoomOut" :aria-label="t('editor.zoomOut')" @click="zoomOut")
            IconBack
          button.canvasActions__zoom(type="button" :disabled="!canZoomIn" :aria-label="t('editor.zoomIn')" @click="zoomIn")
            IconNext
          output.canvasActions__value(aria-live="polite") {{ zoomPercent }}%
        AppButton(:disabled="Boolean(savedAssetId)" @click="openSaveDialog") {{ savedAssetId ? t('common.saved') : t('editor.saveAsNew') }}
        span.visuallyHidden(v-if="savedAssetId" role="status" aria-live="polite") {{ t('common.saved') }}
        span.visuallyHidden(v-if="saveError" role="alert") {{ t('editor.saveFailed') }}
      .canvas
        .artboard(ref="artboardRef" :class="{cropping: tool==='crop'}" :style="artboardZoomStyle")
          IconImagePlaceholder(v-if="originalLayer.visible")
          .textObject(
            v-if="textLayer?.visible"
            :class="{ isDragging: textDragging, isEditing: textEditing, isCropPreview: tool === 'crop' }"
            :style="textObjectStyle"
            @pointerdown.stop="startTextDrag"
          )
            span.textObject__content(
              ref="textObjectRef"
              role="textbox"
              :tabindex="tool === 'crop' ? -1 : 0"
              :aria-label="t('editor.textContent')"
              :aria-multiline="false"
              :contenteditable="tool !== 'crop' && textEditing ? 'true' : 'false'"
              @dblclick.stop="beginTextEdit"
              @keydown="handleTextKeydown"
              @blur="finishTextEdit"
            ) {{ textContent }}
            button.textResizeHandle.textResizeHandle--nw(
              v-if="tool !== 'crop' && !textEditing"
              type="button"
              :aria-label="t('editor.resizeText')"
              @pointerdown.stop="startTextResize($event, 'nw')"
              @keydown="handleTextResizeKeydown"
            )
            button.textResizeHandle.textResizeHandle--ne(
              v-if="tool !== 'crop' && !textEditing"
              type="button"
              :aria-label="t('editor.resizeText')"
              @pointerdown.stop="startTextResize($event, 'ne')"
              @keydown="handleTextResizeKeydown"
            )
            button.textResizeHandle.textResizeHandle--sw(
              v-if="tool !== 'crop' && !textEditing"
              type="button"
              :aria-label="t('editor.resizeText')"
              @pointerdown.stop="startTextResize($event, 'sw')"
              @keydown="handleTextResizeKeydown"
            )
            button.textResizeHandle.textResizeHandle--se(
              v-if="tool !== 'crop' && !textEditing"
              type="button"
              :aria-label="t('editor.resizeText')"
              @pointerdown.stop="startTextResize($event, 'se')"
              @keydown="handleTextResizeKeydown"
            )
          .objectObject(
            v-for="objectLayer in objectLayers"
            v-show="objectLayer.visible"
            :key="objectLayer.key"
            :class="{ isSelected: tool !== 'crop' && selectedLayerKey === objectLayer.key, isDragging: objectLayer.dragging, isCropPreview: tool === 'crop' }"
            :style="objectLayerStyle(objectLayer)"
            :tabindex="tool === 'crop' ? -1 : 0"
            :aria-label="objectLayer.label"
            @pointerdown.stop="startObjectDrag($event, objectLayer)"
            @focus="selectLayer(objectLayer.key)"
          )
            IconImagePlaceholder
            template(v-if="tool !== 'crop' && selectedLayerKey === objectLayer.key")
              button.objectResizeHandle.objectResizeHandle--nw(type="button" :aria-label="t('editor.resizeObject')" @pointerdown.stop="startObjectResize($event, objectLayer, 'nw')" @keydown="handleObjectResizeKeydown($event, objectLayer)")
              button.objectResizeHandle.objectResizeHandle--ne(type="button" :aria-label="t('editor.resizeObject')" @pointerdown.stop="startObjectResize($event, objectLayer, 'ne')" @keydown="handleObjectResizeKeydown($event, objectLayer)")
              button.objectResizeHandle.objectResizeHandle--sw(type="button" :aria-label="t('editor.resizeObject')" @pointerdown.stop="startObjectResize($event, objectLayer, 'sw')" @keydown="handleObjectResizeKeydown($event, objectLayer)")
              button.objectResizeHandle.objectResizeHandle--se(type="button" :aria-label="t('editor.resizeObject')" @pointerdown.stop="startObjectResize($event, objectLayer, 'se')" @keydown="handleObjectResizeKeydown($event, objectLayer)")
          .cropFrame(v-if="tool === 'crop'" :style="cropFrameStyle")
            button.cropHandle.cropHandle--nw(type="button" :aria-label="t('editor.resizeCrop')" @pointerdown.stop="startCropResize($event, 'nw')")
            button.cropHandle.cropHandle--ne(type="button" :aria-label="t('editor.resizeCrop')" @pointerdown.stop="startCropResize($event, 'ne')")
            button.cropHandle.cropHandle--sw(type="button" :aria-label="t('editor.resizeCrop')" @pointerdown.stop="startCropResize($event, 'sw')")
            button.cropHandle.cropHandle--se(type="button" :aria-label="t('editor.resizeCrop')" @pointerdown.stop="startCropResize($event, 'se')")
        p(:style="canvasHintStyle") {{ tool === 'crop' ? t('editor.cropInstructionDynamic', cropOutputDimensions) : t('editor.selectionInstruction') }}
      footer.canvasFoot {{ t('editor.nonDestructive') }}
    aside.layers(v-if="tool!=='crop'")
      h3 {{ t('editor.layers') }} #[button(:aria-label="t('editor.layers')"): IconAddObject]
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
      .properties(v-if="selectedLayerKey === 'text' && textLayer")
        h3 {{ t('editor.textProperties') }}
        input.properties__text(v-model="textContent" :aria-label="t('editor.textContent')")
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
              span.fontSelect__value {{ t(`editor.fontOptions.${selectedFontId}`) }}
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
                      :aria-selected="option.id === selectedFontId"
                      :class="{ isSelected: option.id === selectedFontId }"
                      @click="selectFont(option.id)"
                    )
                      span.fontMenu__col
                        span.fontMenu__name {{ t(`editor.fontOptions.${option.id}`) }}
                        span.fontMenu__desc {{ t(`editor.fontDescriptions.${option.id}`) }}
                      IconCheckCircle.fontMenu__check(v-if="option.id === selectedFontId")
                span.fontMenu__fade(aria-hidden="true")
              .fontMenu__note
                span.fontMenu__noteMain {{ t('editor.fontNoteLicense') }}
                span.fontMenu__noteSub {{ t('editor.fontNoteUpload') }}
          label.colorPicker(:aria-label="t('editor.textColor')" :style="{ '--selected-color': textColor }")
            input(v-model="textColor" type="color" :title="t('editor.textColor')")
        small.properties__settings {{ t('editor.textSettings') }}
      p.editorError(v-if="toolError" role="alert") {{ toolError }}
      .aiCost(v-if="usedTools.length")
        h3 {{ t('editor.aiToolsUsed') }}
        p.aiCost__row(v-for="item in usedTools" :key="item.tool")
          span {{ t(`editor.tools.${item.tool}`) }}
          span.aiCost__amount.aiCost__amount--item
            IconFeedBottleSmall
            b {{ t('units.feed', { count: item.cost }) }}
        p.aiCost__row.aiCost__row--total
          strong {{ t('editor.total') }}
          span.aiCost__amount.aiCost__amount--total
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
      p {{ t('editor.dimensionsDynamic', cropOutputDimensions) }}
      h3 {{ t('editor.channelPreviews') }}
      .previews
        .preview(v-for="p in previews" :key="p.name")
          .preview__thumb(:class="p.shape"): IconImagePlaceholder
          strong {{ p.name }}
          small(:class="p.warn?'warn':''") {{ p.warn ? t('editor.croppedWarning') : t('editor.fullyVisible') }}
      p.cropNote {{ t('editor.cropNote') }}
  ImagePickerDialog(v-model:open="editorPickerOpen" :title="editorPickerTitle" @select="selectEditorAsset")
  SaveAssetDialog(
    v-model:open="saveDialogOpen"
    :default-name="suggestedAssetName"
    :original-name="selectedAssetName"
    :folders="folders"
    :loading="savingAsset"
    @save="saveAsNewAsset"
  )
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import AppCheckbox from '@/components/AppCheckbox.vue'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import SaveAssetDialog from '@/components/SaveAssetDialog.vue'
import { useAssets } from '@/composables/useAssets'
import {
  IconAiSparkle,
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
import type { AppliedEditTool, EditorPricing, RetouchOptionKey } from '@/types/api'
import type { Asset } from '@/types/asset'
const props = defineProps<{ mode: string }>()
const { t } = useI18n()
const { saveEdited, folders, loadFolders } = useAssets()
const feed = useFeedStore()

// 價目表一律問後端，前端不寫死金額（CLAUDE.md：前端不得硬寫範例數字）
const pricing = ref<EditorPricing | null>(null)
const removeToolCost = computed(() => pricing.value?.tools.remove ?? 0)
// 本次編輯已實際套用（並已扣款）的 AI 工具
const usedTools = ref<AppliedEditTool[]>([])
const usedToolsTotal = computed(() => usedTools.value.reduce((total, item) => total + item.cost, 0))
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
const editorPickerOpen = ref(false)
const editorPickerPurpose = ref<'source' | 'object'>('source')
const editorPickerTitle = computed(() =>
  t(editorPickerPurpose.value === 'object' ? 'editor.objectPickerTitle' : 'editor.sourcePickerTitle'),
)
const selectedAssetName = ref(t('editor.demoAsset'))
const savingAsset = ref(false)
const savedAssetId = ref('')
const saveError = ref(false)
const saveDialogOpen = ref(false)
const openEditorPicker = (purpose: 'source' | 'object') => {
  editorPickerPurpose.value = purpose
  editorPickerOpen.value = true
}
const openObjectPicker = () => {
  tool.value = 'object'
  openEditorPicker('object')
}
const selectEditorAsset = (asset: Asset) => {
  if (editorPickerPurpose.value === 'object') {
    addObjectLayer(asset)
    return
  }
  selectedAssetName.value = asset.name
  savedAssetId.value = ''
  // 換了來源素材＝重新開始，先前的扣款紀錄不再屬於這張圖
  usedTools.value = []
  toolError.value = ''
}
const suggestedAssetName = computed(() => {
  if (props.mode === 'retouch') return `${selectedAssetName.value}_${t('editor.saveDialog.suffixes.retouch')}`
  const suffixKey = ['remove', 'object', 'fade', 'text', 'crop'].includes(tool.value) ? tool.value : 'edited'
  return `${selectedAssetName.value}_${t(`editor.saveDialog.suffixes.${suffixKey}`)}`
})
const openSaveDialog = () => {
  if (savingAsset.value || savedAssetId.value) return
  saveError.value = false
  loadFolders() // 讓「存放位置」下拉能列出使用者資料夾
  saveDialogOpen.value = true
}

type SaveAssetPayload = { name: string; folder: string; keepLayers: boolean; alsoDownload: boolean }

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
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${name}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

const saveAsNewAsset = async (payload: SaveAssetPayload) => {
  if (savingAsset.value || savedAssetId.value) return
  savingAsset.value = true
  saveError.value = false
  try {
    const saved = await saveEdited(payload.name, { folder: payload.folder, keepLayers: payload.keepLayers })
    savedAssetId.value = saved.id
    if (payload.alsoDownload) downloadEditedCopy(payload.name)
    saveDialogOpen.value = false
  } catch {
    saveError.value = true
  } finally {
    savingAsset.value = false
  }
}
const textContent = ref(t('editor.demoText'))
const textColor = ref('#2e3567')
const textObjectRef = ref<HTMLElement | null>(null)
const textPosition = reactive({ x: 50, y: 58 })
const textScale = ref(1)
const textDragging = ref(false)
const textEditing = ref(false)
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
const selectedFontId = ref<FontId>('notoSansTC')
const selectedFont = computed(() => fontOptions.find((option) => option.id === selectedFontId.value) ?? fontOptions[0])
// 設計稿的字型選單是自訂面板（每列有副標、選中列有打勾），原生 select 的 option 由
// 作業系統繪製，做不出這個樣式，因此自行實作 listbox。
const fontMenuOpen = ref(false)
const fontSelectEl = ref<HTMLElement | null>(null)
const selectFont = (id: FontId) => {
  selectedFontId.value = id
  fontMenuOpen.value = false
}
const onFontMenuPointerDown = (event: MouseEvent) => {
  if (!fontMenuOpen.value) return
  if (fontSelectEl.value?.contains(event.target as Node)) return
  fontMenuOpen.value = false
}
const onFontMenuKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && fontMenuOpen.value) fontMenuOpen.value = false
}
document.addEventListener('pointerdown', onFontMenuPointerDown)
document.addEventListener('keydown', onFontMenuKeydown)
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onFontMenuPointerDown)
  document.removeEventListener('keydown', onFontMenuKeydown)
})
const textObjectStyle = computed(() => ({
  left: `${textPosition.x}%`,
  top: `${textPosition.y}%`,
  color: textColor.value,
  fontFamily: selectedFont.value.family,
  fontWeight: selectedFont.value.weight,
  fontSize: `${1.25 * textScale.value}rem`,
  zIndex: layerZIndex('text'),
}))
const retouchSetupOpen = ref(false)
const retouchMethod = ref<'quick' | 'command'>('quick')
const commandRetouchBaseCost = computed(() => pricing.value?.commandBase ?? 0)
const retouchOptionsOpen = ref(true)
const retouchInstruction = ref('')
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
// 送出修圖：扣款與最終金額都以後端為準，畫面上的預估只是預估。
// 送出的項目取 retouchOptionsForMethod（而非全部），否則指令式修圖會把沒收費的快速項目也列進結果。
async function startRetouch() {
  if (!canStartRetouch.value || retouching.value) return
  retouching.value = true
  retouchError.value = ''
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
    retouching.value = false
  }
}

// 背景移除是「執行當下即扣」，同一張素材只扣一次；其餘工具不扣飼料。
async function selectRemoveTool() {
  tool.value = 'remove'
  if (applyingTool.value || usedTools.value.some((item) => item.tool === 'remove')) return
  applyingTool.value = 'remove'
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
type EditorLayerType = 'text' | 'object' | 'fade' | 'original'
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
}
type ObjectCorner = 'nw' | 'ne' | 'sw' | 'se'
const layers = reactive<EditorLayer[]>([
  { key: 'fade', type: 'fade', visible: true, locked: false },
  { key: 'original', type: 'original', visible: true, locked: true },
])
const selectedLayerKey = ref('original')
const draggedLayerKey = ref('')
const dropTargetKey = ref('')
const layerLabel = (layer: EditorLayer) => layer.label ?? t(`editor.layerItems.${layer.type}`)
const layerDescription = (layer: EditorLayer) => {
  if (layer.type === 'original') return t(layer.locked ? 'editor.originalLocked' : 'editor.originalUnlocked')
  return t(`editor.layerDescriptions.${layer.type}`)
}
const selectLayer = (key: string) => {
  const layer = layers.find((item) => item.key === key)
  if (!layer) return
  selectedLayerKey.value = key
  if (layer.type !== 'original') tool.value = layer.type
}
watch(tool, (currentTool) => {
  if (currentTool === 'fade') selectedLayerKey.value = 'fade'
})
const textLayer = computed(() => layers.find((layer) => layer.type === 'text'))
const objectLayers = computed(() => layers.filter((layer): layer is ObjectEditorLayer => layer.type === 'object'))
const originalLayer = computed(() => layers.find((layer) => layer.key === 'original')!)
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
const insertTextLayer = async () => {
  tool.value = 'text'
  if (!textLayer.value) {
    layers.unshift({ key: 'text', type: 'text', visible: true, locked: false })
    textContent.value = t('editor.newTextPlaceholder')
    textPosition.x = 50
    textPosition.y = 58
    textScale.value = 1
  } else {
    textLayer.value.visible = true
  }
  selectedLayerKey.value = 'text'
  savedAssetId.value = ''
  await beginTextEdit()
}
function addObjectLayer(asset: Asset) {
  const key = `object-${crypto.randomUUID()}`
  const layer: ObjectEditorLayer = {
    key,
    type: 'object',
    visible: true,
    locked: false,
    label: t('editor.objectLayerDynamic', { name: asset.name }),
    x: 50,
    y: 50,
    scale: 1,
    dragging: false,
  }
  layers.unshift(layer)
  tool.value = 'object'
  selectedLayerKey.value = key
  savedAssetId.value = ''
}
const toggleOriginalLock = () => {
  originalLayer.value.locked = !originalLayer.value.locked
  if (originalLayer.value.locked) originalLayer.value.visible = true
}
const RETOUCH_OPTION_KEYS: RetouchOptionKey[] = ['removeObjects', 'repair', 'lighting', 'upscale']
// cost／free 由 getEditorPricing 填入，這裡只保留預設勾選狀態
const retouchOptions = ref(RETOUCH_OPTION_KEYS.map((key, index) => ({ key, on: index < 2, free: true, cost: 0 })))
const retouchOptionsForMethod = computed(() =>
  retouchMethod.value === 'command'
    ? retouchOptions.value.filter((option) => ['lighting', 'upscale'].includes(option.key))
    : retouchOptions.value,
)
function setRetouchMethod(method: 'quick' | 'command') {
  if (retouchMethod.value === method) return

  retouchSelections[retouchMethod.value] = retouchOptions.value
    .filter((option) => option.on)
    .map((option) => option.key)
  retouchMethod.value = method
  retouchOptions.value.forEach((option) => {
    option.on = retouchSelections[method].includes(option.key)
  })
  retouchOptionsOpen.value = method === 'quick'
}
const estimatedRetouchCost = computed(
  () =>
    (retouchMethod.value === 'command' ? commandRetouchBaseCost.value : 0) +
    retouchOptionsForMethod.value.reduce((total, option) => total + (option.on ? option.cost : 0), 0),
)
const canStartRetouch = computed(() => retouchMethod.value === 'quick' || retouchInstruction.value.trim().length > 0)
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
let textDragCleanup: (() => void) | undefined
let textResizeCleanup: (() => void) | undefined
let objectInteractionCleanup: (() => void) | undefined
const startTextDrag = (event: PointerEvent) => {
  if (textEditing.value || event.button !== 0 || !artboardRef.value) return
  event.preventDefault()
  selectLayer('text')
  const artboardBounds = artboardRef.value.getBoundingClientRect()
  const textBounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const halfWidth = Math.min(50, (textBounds.width / artboardBounds.width) * 50)
  const halfHeight = Math.min(50, (textBounds.height / artboardBounds.height) * 50)
  const start = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    x: textPosition.x,
    y: textPosition.y,
  }
  textDragging.value = true
  const onMove = (moveEvent: PointerEvent) => {
    const nextX = start.x + ((moveEvent.clientX - start.pointerX) / artboardBounds.width) * 100
    const nextY = start.y + ((moveEvent.clientY - start.pointerY) / artboardBounds.height) * 100
    textPosition.x = Math.max(halfWidth, Math.min(100 - halfWidth, nextX))
    textPosition.y = Math.max(halfHeight, Math.min(100 - halfHeight, nextY))
  }
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    textDragging.value = false
    textDragCleanup = undefined
  }
  textDragCleanup?.()
  textDragCleanup = onUp
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}
const objectLayerStyle = (layer: ObjectEditorLayer) => ({
  left: `${layer.x}%`,
  top: `${layer.y}%`,
  width: `${24 * layer.scale}%`,
  zIndex: layerZIndex(layer.key),
})
const startObjectDrag = (event: PointerEvent, layer: ObjectEditorLayer) => {
  if (event.button !== 0 || !artboardRef.value) return
  event.preventDefault()
  selectLayer(layer.key)
  const artboardBounds = artboardRef.value.getBoundingClientRect()
  const objectBounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const halfWidth = Math.min(50, (objectBounds.width / artboardBounds.width) * 50)
  const halfHeight = Math.min(50, (objectBounds.height / artboardBounds.height) * 50)
  const start = { pointerX: event.clientX, pointerY: event.clientY, x: layer.x, y: layer.y }
  layer.dragging = true
  const onMove = (moveEvent: PointerEvent) => {
    const nextX = start.x + ((moveEvent.clientX - start.pointerX) / artboardBounds.width) * 100
    const nextY = start.y + ((moveEvent.clientY - start.pointerY) / artboardBounds.height) * 100
    layer.x = Math.max(halfWidth, Math.min(100 - halfWidth, nextX))
    layer.y = Math.max(halfHeight, Math.min(100 - halfHeight, nextY))
  }
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    layer.dragging = false
    objectInteractionCleanup = undefined
  }
  objectInteractionCleanup?.()
  objectInteractionCleanup = onUp
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}
const startObjectResize = (event: PointerEvent, layer: ObjectEditorLayer, _corner: ObjectCorner) => {
  if (event.button !== 0) return
  event.preventDefault()
  selectLayer(layer.key)
  const bounds = (event.currentTarget as HTMLElement).parentElement?.getBoundingClientRect()
  if (!bounds) return
  const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  const startDistance = Math.max(1, Math.hypot(event.clientX - center.x, event.clientY - center.y))
  const startScale = layer.scale
  const onMove = (moveEvent: PointerEvent) => {
    const distance = Math.hypot(moveEvent.clientX - center.x, moveEvent.clientY - center.y)
    layer.scale = Math.max(0.35, Math.min(2.5, startScale * (distance / startDistance)))
  }
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    objectInteractionCleanup = undefined
  }
  objectInteractionCleanup?.()
  objectInteractionCleanup = onUp
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}
const handleObjectResizeKeydown = (event: KeyboardEvent, layer: ObjectEditorLayer) => {
  if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
  event.preventDefault()
  const increase = event.key === 'ArrowUp' || event.key === 'ArrowRight'
  const step = event.shiftKey ? 0.1 : 0.05
  layer.scale = Math.max(0.35, Math.min(2.5, layer.scale + (increase ? step : -step)))
}
const beginTextEdit = async () => {
  textEditing.value = true
  await nextTick()
  const element = textObjectRef.value
  if (!element) return
  element.focus()
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(element)
  selection?.removeAllRanges()
  selection?.addRange(range)
}
const finishTextEdit = () => {
  if (!textEditing.value) return
  textContent.value = textObjectRef.value?.textContent ?? ''
  textEditing.value = false
}
const handleTextKeydown = (event: KeyboardEvent) => {
  if (!textEditing.value && (event.key === 'Enter' || event.key === 'F2')) {
    event.preventDefault()
    void beginTextEdit()
    return
  }
  if (textEditing.value && event.key === 'Enter') {
    event.preventDefault()
    finishTextEdit()
    ;(event.currentTarget as HTMLElement).blur()
  } else if (textEditing.value && event.key === 'Escape') {
    event.preventDefault()
    textEditing.value = false
    const element = event.currentTarget as HTMLElement
    element.textContent = textContent.value
    element.blur()
  }
}
const resizeTextBy = (amount: number) => {
  textScale.value = Math.max(0.5, Math.min(3, textScale.value + amount))
}
const handleTextResizeKeydown = (event: KeyboardEvent) => {
  if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key)) return
  event.preventDefault()
  resizeTextBy(event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 0.1 : -0.1)
}
const startTextResize = (event: PointerEvent, corner: CropCorner) => {
  if (event.button !== 0) return
  event.preventDefault()
  const start = { x: event.clientX, y: event.clientY, scale: textScale.value }
  const horizontalDirection = corner.includes('w') ? -1 : 1
  const verticalDirection = corner.includes('n') ? -1 : 1
  const onMove = (moveEvent: PointerEvent) => {
    const delta =
      ((moveEvent.clientX - start.x) * horizontalDirection + (moveEvent.clientY - start.y) * verticalDirection) / 160
    textScale.value = Math.max(0.5, Math.min(3, start.scale + delta))
  }
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    textResizeCleanup = undefined
  }
  textResizeCleanup?.()
  textResizeCleanup = onUp
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}
const cropRect = reactive({ x: 12.5, y: 0, width: 75, height: 100 })
watch(
  [
    textContent,
    textColor,
    textScale,
    selectedFontId,
    tool,
    retouchInstruction,
    () => retouchOptions.value.map((option) => `${option.key}:${option.on}`).join('|'),
    () => `${cropRect.x}:${cropRect.y}:${cropRect.width}:${cropRect.height}`,
  ],
  () => {
    savedAssetId.value = ''
    saveError.value = false
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
const cropOutputDimensions = computed(() => {
  const option = ratioOptions.value.find((item) => item.id === ratio.value)
  if (option?.id === 'original') return { width: 1440, height: 1080 }
  if (option?.id === 'fourFive') return { width: 1080, height: 1350 }
  if (option?.id === 'story') return { width: 1080, height: 1920 }
  if (option?.id === 'wide') return { width: 1920, height: 1080 }
  if (option?.id === 'square') return { width: 1080, height: 1080 }
  return {
    width: Math.round(1440 * (cropRect.width / 100)),
    height: Math.round(1080 * (cropRect.height / 100)),
  }
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
let resizeCleanup: (() => void) | undefined
const startCropResize = (event: PointerEvent, corner: CropCorner) => {
  if (!artboardRef.value) return
  event.preventDefault()
  ratio.value = 'custom'
  const bounds = artboardRef.value.getBoundingClientRect()
  const start = { pointerX: event.clientX, pointerY: event.clientY, ...cropRect }
  const onMove = (moveEvent: PointerEvent) => {
    const dx = ((moveEvent.clientX - start.pointerX) / bounds.width) * 100
    const dy = ((moveEvent.clientY - start.pointerY) / bounds.height) * 100
    const right = start.x + start.width
    const bottom = start.y + start.height
    const minSize = 10
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
  }
  const onUp = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    resizeCleanup = undefined
  }
  resizeCleanup?.()
  resizeCleanup = onUp
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp, { once: true })
}
onBeforeUnmount(() => {
  artboardResizeObserver?.disconnect()
  resizeCleanup?.()
  textDragCleanup?.()
  textResizeCleanup?.()
  objectInteractionCleanup?.()
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
.artboard.cropping {
  overflow: hidden;

  .textObject,
  .objectObject {
    pointer-events: none;
  }
}
.cropFrame {
  position: absolute;
  z-index: 100;
  border: 2px dashed #2e3567;
  box-shadow: 0 0 0 100vmax rgba(0, 0, 0, 0.32);
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
.aiCost {
  border-top: 1px solid #d2d5dd;
  padding: 0 1rem 1rem;
}
.properties h3,
.aiCost h3 {
  padding-left: 0;
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
  min-height: 4.125rem;
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
.custom {
  margin: 0 1rem 0.5rem;
}
.custom.active {
  border-color: #606692;
  color: #2e3567;
  font-weight: 500;
}
.cropPanel > p {
  font-size: 0.75rem;
  color: #606692;
  padding: 0 1rem;
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
.preview__thumb.wide {
  width: 7.5rem;
  height: 4.25rem;
  margin-top: 3.25rem;
}
.preview small {
  color: #b4b9c4;
}
.preview small.warn {
  color: #ea903a;
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
.method.active {
  border-color: #2e3567;
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
