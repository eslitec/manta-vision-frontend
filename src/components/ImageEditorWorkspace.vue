<template lang="pug">
.workspace(:class="{ 'isRetouch': mode === 'retouch' }")
  template(v-if="mode === 'retouch'")
    aside.retouchPanel
      h3 {{ t('editor.retouch.steps.source') }}
      .sourceThumb: i.ti.ti-photo
      button.outline {{ t('common.selectFromLibrary') }}
      span.uploadTip {{ t('common.orDragUpload') }}
      h3 {{ t('editor.retouch.steps.method') }}
      .methodRow
        button.method.active #[strong {{ t('editor.retouch.quick') }}] #[small {{ t('editor.retouch.quickHint') }}]
        button.method #[strong {{ t('editor.retouch.command') }}] #[small {{ t('editor.retouch.commandHint') }}]
      h3 {{ t('editor.retouch.steps.options') }}
      label.option(v-for="(o,i) in retouchOptions" :key="o.key")
        input(type="checkbox" v-model="o.on")
        span.option__copy #[strong {{ t(`editor.retouch.options.${o.key}.name`) }}] #[small {{ t(`editor.retouch.options.${o.key}.hint`) }}]
        b(:class="o.free ? 'free' : ''") {{ o.free ? t('editor.free') : t('editor.feedShort', { count: i === 3 ? 5 : 8 }) }}
      h3 {{ t('editor.retouch.steps.instruction') }}
      textarea(:placeholder="t('editor.retouch.placeholder')")
      footer.panelAction
        span {{ t('common.estimatedCost') }} #[b {{ t('units.feed', { count: 16 }) }}]
        button.primary {{ t('editor.retouch.start') }}
    section.resultPanel
      header.resultHead #[strong {{ t('editor.retouch.result') }}] #[span {{ t('editor.retouch.applied') }}]
      .compare
        .compare__item #[span {{ t('editor.original') }}] #[.compare__thumb: i.ti.ti-photo] #[small {{ t('editor.uploadedDate') }}]
        .compare__item #[span.active {{ t('editor.afterRetouch') }}] #[.compare__thumb: i.ti.ti-photo] #[small {{ t('editor.consumed', { count: 16 }) }}]
      footer.resultActions
        span {{ t('editor.saveHint') }}
        button.outline {{ t('editor.retouch.again') }}
        button.outline {{ t('common.download') }}
        button.primary {{ t('editor.saveAsNew') }}

  template(v-else)
    aside.tools
      button.tool(:class="{active: tool==='remove'}" @click="tool='remove'") #[i.ti.ti-sparkles] #[span {{ t('editor.tools.remove') }}] #[small 8]
      button.tool(@click="tool='object'") #[i.ti.ti-plus] #[span {{ t('editor.tools.object') }}]
      button.tool(@click="tool='fade'") #[i.ti.ti-photo] #[span {{ t('editor.tools.fade') }}]
      button.tool(@click="tool='text'") #[i.ti.ti-text-size] #[span {{ t('editor.tools.text') }}]
      button.tool(:class="{active: tool==='crop'}" @click="tool='crop'") #[i.ti.ti-crop] #[span {{ t('editor.tools.crop') }}]
    section.canvasPanel
      header.canvasHead
        strong #[i.ti.ti-photo] {{ t('editor.demoAsset') }}
        span {{ t('editor.status', { status: tool === 'crop' ? t('editor.cropping') : t('editor.edited') }) }}
        .canvasActions ‹　›　80%
        button.primary {{ t('editor.saveAsNew') }}
      .canvas
        .artboard(:class="{cropping: tool==='crop'}")
          i.ti.ti-photo
          .textObject(v-if="tool!=='crop'") {{ t('editor.demoText') }}
        p {{ tool === 'crop' ? t('editor.cropInstruction') : t('editor.selectionInstruction') }}
      footer.canvasFoot {{ t('editor.nonDestructive') }}
    aside.layers(v-if="tool!=='crop'")
      h3 {{ t('editor.layers') }} #[button ＋]
      .layer(v-for="l in layers" :key="l") #[input(type="checkbox" checked)] #[i.ti.ti-photo] #[span {{ l }}]
      .properties
        h3 {{ t('editor.textProperties') }}
        input(:value="t('editor.demoText')")
        .fontRow #[button {{ t('editor.font') }}] #[span.color]
        small {{ t('editor.textSettings') }}
      .aiCost
        h3 {{ t('editor.aiToolsUsed') }}
        p {{ t('editor.tools.remove') }} #[b {{ t('units.feed', { count: 8 }) }}]
        p #[strong {{ t('editor.total') }}] #[b {{ t('units.feed', { count: 8 }) }}]
        small {{ t('editor.costNote') }}
    aside.cropPanel(v-else)
      h3 {{ t('editor.tools.crop') }} #[i.ti.ti-refresh]
      .ratioRow
        button(v-for="r in ratios" :key="r" :class="{active:ratio===r}" @click="ratio=r") {{ r }}
      button.custom {{ t('editor.custom') }}
      p {{ t('editor.dimensions') }}
      h3 {{ t('editor.channelPreviews') }}
      .previews
        .preview(v-for="p in previews" :key="p.name")
          .preview__thumb(:class="p.shape"): i.ti.ti-photo
          strong {{ p.name }}
          small(:class="p.warn?'warn':''") {{ p.warn ? t('editor.croppedWarning') : t('editor.fullyVisible') }}
      p.cropNote {{ t('editor.cropNote') }}
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
const props = defineProps<{ mode: string }>()
const { t } = useI18n()
const tool = ref('text'),
  ratio = ref('1:1')
watch(
  () => props.mode,
  () => {
    tool.value = 'text'
  },
)
const layers = computed(() => ['text', 'object', 'fade', 'original'].map((key) => t(`editor.layerItems.${key}`)))
const retouchOptions = ref(
  ['removeObjects', 'repair', 'lighting', 'upscale'].map((key, index) => ({ key, on: index < 2, free: index === 2 })),
)
const ratios = computed(() => [t('editor.originalRatio'), '1:1', '4:5', '9:16', '16:9'])
const previews = computed(() =>
  ['igPost', 'igStory', 'fbPost', 'line'].map((key, index) => ({
    name: t(`editor.previews.${key}`),
    shape: ['square', 'portrait', 'fourFive', 'wide'][index],
    warn: index > 0,
  })),
)
</script>

<style scoped lang="scss">
.workspace {
  display: grid;
  grid-template-columns: 3.75rem 1fr 15rem;
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
  border-radius: 10px;
  box-shadow: 0 4px 7px rgba(96, 100, 114, 0.2);
  overflow: hidden;
}
.tools {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.3125rem;
}
.tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1875rem;
  border-radius: 7px;
  padding: 0.5625rem 0.1875rem;
  color: #606692;
  font-size: 0.6875rem;
}
.tool i {
  font-size: 1.25rem;
  color: #a5c8e6;
}
.tool small {
  color: #ea903a;
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
  height: 2.75rem;
  padding: 0 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  border-bottom: 1px solid #d2d5dd;
  font-size: 0.75rem;
}
.canvasHead strong {
  color: #2e3567;
}
.canvasHead > span {
  border: 1px solid #d2d5dd;
  border-radius: 12px;
  padding: 0.125rem 0.5rem;
  color: #606692;
}
.canvasActions {
  margin-left: auto;
  color: #606692;
}
.primary,
.outline {
  border-radius: 18px;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  box-shadow: 0 3px 3px #0002;
}
.primary {
  background: #2e3567;
  color: white;
}
.outline {
  background: white;
  border: 1px solid #2e3567;
  color: #2e3567;
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
  width: 24.375rem;
  height: 18.125rem;
  background: white;
  border: 1px solid #d2d5dd;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  color: #aab8d0;
  font-size: 2.75rem;
}
.artboard.cropping {
  width: 21.25rem;
  height: 18.125rem;
  border: 2px dashed #2e3567;
  box-shadow:
    -50px 0 #0004,
    50px 0 #0004;
}
.textObject {
  position: absolute;
  top: 58%;
  border: 1px dashed #2e3567;
  padding: 0.375rem 0.625rem;
  color: #2e3567;
  font-size: 1.25rem;
  font-weight: 700;
}
.canvas p {
  font-size: 0.625rem;
  color: #b4b9c4;
}
.canvasFoot {
  height: 1.75rem;
  margin: 0 0.75rem;
  background: #fff;
  padding: 0.5rem 0.75rem;
  font-size: 0.625rem;
  color: #606692;
}
.layers h3,
.cropPanel h3 {
  font-size: 0.8125rem;
  color: #2e3567;
  padding: 0.75rem 0.875rem;
}
.layers h3 button {
  float: right;
  font-size: 1.25rem;
}
.layer {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  padding: 0.4375rem 0.75rem;
  font-size: 0.6875rem;
  border-bottom: 1px solid #eff2fa;
}
.layer i {
  font-size: 1.25rem;
  color: #a5c8e6;
}
.properties,
.aiCost {
  border-top: 1px solid #d2d5dd;
  padding: 0 0.75rem 0.75rem;
}
.properties h3,
.aiCost h3 {
  padding-left: 0;
}
.properties input,
.fontRow button {
  width: 100%;
  border: 1px solid #d2d5dd;
  border-radius: 15px;
  padding: 0.4375rem 0.625rem;
  font-size: 0.6875rem;
}
.fontRow {
  display: flex;
  gap: 0.5rem;
  margin: 0.5rem 0;
}
.color {
  width: 2.1875rem;
  border-radius: 6px;
  background: #2e3567;
}
.properties small,
.aiCost small {
  font-size: 0.5625rem;
  color: #b4b9c4;
}
.aiCost p {
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  margin: 0.4375rem 0;
}
.aiCost b {
  color: #ea903a;
}
.cropPanel {
  padding-bottom: 0.75rem;
}
.cropPanel .ratioRow {
  display: flex;
  gap: 0.375rem;
  padding: 0 0.75rem;
}
.ratioRow button,
.custom {
  border: 1px solid #d2d5dd;
  border-radius: 15px;
  padding: 0.25rem 0.5625rem;
  font-size: 0.6875rem;
}
.ratioRow button.active {
  border-color: #606692;
  color: #2e3567;
}
.custom {
  margin: 0.5rem 0.75rem;
}
.cropPanel > p {
  font-size: 0.625rem;
  color: #606692;
  padding: 0 0.75rem;
}
.previews {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem 0.5rem;
  padding: 0 0.75rem;
}
.preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.5625rem;
}
.preview__thumb {
  height: 5.875rem;
  background: #eff2fa;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aab8d0;
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}
.preview__thumb.square {
  width: 5.875rem;
}
.preview__thumb.portrait {
  width: 3.375rem;
}
.preview__thumb.fourFive {
  width: 4.625rem;
}
.preview__thumb.wide {
  width: 5.875rem;
  height: 3.375rem;
  margin-top: 2.5rem;
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
  grid-template-columns: 18.75rem 1fr;
}
.retouchPanel {
  padding: 1.125rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.retouchPanel h3 {
  font-size: 0.8125rem;
  color: #2e3567;
  margin-top: 0.1875rem;
}
.sourceThumb {
  height: 8rem;
  background: #eff2fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aab8d0;
  font-size: 1.75rem;
}
.uploadTip {
  font-size: 0.625rem;
  color: #b4b9c4;
  margin-left: 0.5rem;
}
.methodRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.method {
  border: 1px solid #d2d5dd;
  border-radius: 7px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
}
.method.active {
  border-color: #2e3567;
}
.method small,
.option small {
  font-size: 0.5625rem;
  color: #b4b9c4;
}
.option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #eff2fa;
  border-radius: 7px;
  padding: 0.5rem;
  font-size: 0.6875rem;
}
.option__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
}
.option b {
  color: #ea903a;
  font-size: 0.625rem;
}
.option b.free {
  color: #45b85b;
}
.retouchPanel textarea {
  height: 3.125rem;
  border: 1px solid #d2d5dd;
  border-radius: 7px;
  padding: 0.5rem;
}
.panelAction {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #d2d5dd;
  padding-top: 0.625rem;
  font-size: 0.6875rem;
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
  font-size: 0.625rem;
}
.compare {
  flex: 1;
  background: #eff2fa;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}
.compare__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.625rem;
  color: #b4b9c4;
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
  width: 13.125rem;
  height: 15.9375rem;
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
  padding: 0.875rem 1rem;
  font-size: 0.625rem;
  color: #606692;
}
.resultActions span {
  margin-right: auto;
}
</style>
