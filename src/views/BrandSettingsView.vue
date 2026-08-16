<template lang="pug">
.brand(v-if="profile")
  header.brand__head
    h1.brand__title {{ t('brandSettings.title') }}
    p.brand__subtitle {{ t('brandSettings.subtitle') }}
  nav.brandTabs(role="tablist" :aria-label="t('brandSettings.title')")
    AppTab(
      v-for="item in tabs"
      :id="`brand-tab-${item.value}`"
      :key="item.value"
      :active="tab === item.value"
      :aria-controls="`brand-panel-${item.value}`"
      @click="tab = item.value"
    ) {{ item.label }}

  section#brand-panel-basic.card.card--basic(v-if="tab === 'basic'" role="tabpanel" aria-labelledby="brand-tab-basic")
    .card__head
      h2 {{ t('brandSettings.tabs.basic') }}
    .field
      label(for="brand-name") {{ t('brandSettings.fields.name') }} #[small {{ profile.name.length }} / 20]
      input#brand-name(v-model="profile.name" maxlength="20" :placeholder="t('brand.name')")
    .field
      label(for="brand-positioning") {{ t('brandSettings.fields.positioning') }} #[small {{ profile.positioning.length }} / 30]
      input#brand-positioning(v-model="profile.positioning" maxlength="30" :placeholder="t('brandSettings.placeholders.positioning')")
    .field
      label(for="brand-website") {{ t('brandSettings.fields.website') }}
      input#brand-website(v-model="profile.website" inputmode="url" placeholder="www.rihan-select.com")
    .field
      label(for="brand-industry") {{ t('brandSettings.fields.industry') }}
      .selectWrap
        select#brand-industry(v-model="profile.industry")
          option(v-for="item in industries" :key="item.value" :value="item.value") {{ item.label }}
        IconChevronDown

  section#brand-panel-visual.card.card--visual(v-else-if="tab === 'visual'" role="tabpanel" aria-labelledby="brand-tab-visual")
    .card__head
      h2 {{ t('brandSettings.tabs.visual') }}
      p.card__sub {{ t('brandSettings.visualSubtitle') }}
    .field
      label {{ t('brandSettings.fields.logo') }}
      label.logo(for="brand-logo-upload")
        input#brand-logo-upload(type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" @change="onLogo")
        IconImagePlaceholder
        .logo__copy
          strong {{ profile.logoName || t('brandSettings.logoUpload') }}
          span {{ t('brandSettings.logoUsage') }}
      p.paletteStatus(v-if="analyzing" role="status" aria-live="polite") {{ t('brandSettings.palette.analyzing') }}
      p.paletteStatus.paletteStatus--error(v-else-if="paletteError" role="alert") {{ paletteError }}
      .detectedPalette(v-else-if="detectedColors.length" aria-labelledby="detected-palette-title")
        .detectedPalette__head
          strong#detected-palette-title {{ t('brandSettings.palette.title') }}
          span {{ t('brandSettings.palette.hint') }}
        .detectedPalette__colors
          button.detectedColor(
            v-for="color in detectedColors"
            :key="color"
            type="button"
            :class="{ 'isSelected': selectedColor === color }"
            :aria-pressed="selectedColor === color"
            :aria-label="t('brandSettings.palette.select', { color })"
            @click="selectedColor = color"
          )
            span.detectedColor__sample(:style="{ backgroundColor: color }" aria-hidden="true")
            span {{ color }}
        .detectedPalette__assign(v-if="selectedColor")
          span {{ t('brandSettings.palette.assign', { color: selectedColor }) }}
          .detectedPalette__actions
            AppButton(
              v-for="(label, index) in colorLabels"
              :key="label"
              size="compact"
              :variant="profile.colors[index]?.hex.toUpperCase() === selectedColor ? 'primary' : 'outline'"
              @click="assignColor(index)"
            ) {{ t('brandSettings.palette.setAs', { role: label }) }}
    .field
      label {{ t('brandSettings.fields.colors') }}
      .swatches
        .swatch(v-for="(c, i) in profile.colors" :key="i")
          input(type="color" v-model="c.hex" :aria-label="colorLabels[i] || t('brandSettings.color.new')")
          span.swatch__name {{ colorLabels[i] || t('brandSettings.color.new') }}
          span {{ c.hex.toUpperCase() }}
        button.swatch.swatch--add(type="button" :aria-label="t('common.add')" @click="addColor")
          span.swatch__color(aria-hidden="true")
          span.swatch__name {{ t('common.add') }}

  section#brand-panel-copy.card.card--copy(v-else-if="tab === 'copy'" role="tabpanel" aria-labelledby="brand-tab-copy")
    .card__head
      h2 {{ t('brandSettings.tabs.copy') }}
      p.card__sub {{ t('brandSettings.copySubtitle') }}
    .field
      label {{ t('brandSettings.fields.tones') }}
      .chips
        button.chip(v-for="t in toneOptions" :key="t" type="button" :aria-pressed="profile.tones.includes(t)" :class="{ active: profile.tones.includes(t) }" @click="toggleTone(t)") {{ t }}
    .field
      label {{ t('brandSettings.fields.hashtags') }}
      .chips
        span.tag(v-for="(h, i) in profile.hashtags" :key="h")
          | {{ h }}
          button.tag__remove(type="button" :aria-label="`${t('common.delete')} ${h}`" @click="removeHashtag(i)") ×
        input.tagInput(v-if="addingTag" ref="tagInput" v-model="newTag" :aria-label="t('brandSettings.addHashtag')" @keyup.enter="confirmAddTag" @blur="confirmAddTag")
        button.chip.chip--add(v-else type="button" @click="startAddTag") {{ t('brandSettings.addHashtag') }}
    .field
      label(for="brand-addressing") {{ t('brandSettings.fields.addressing') }}
      .selectWrap
        select#brand-addressing(v-model="profile.addressing")
          option(v-for="item in addressingOptions" :key="item.value" :value="item.value") {{ item.label }}
        IconChevronDown
    .field
      label(for="brand-avoid-words") {{ t('brandSettings.fields.avoidWords') }}
      textarea#brand-avoid-words(v-model="profile.avoidWords" rows="3" :placeholder="t('brandSettings.placeholders.avoidWords')")

  section#brand-panel-compliance.card.card--compliance(v-else role="tabpanel" aria-labelledby="brand-tab-compliance")
    .card__head
      h2 {{ t('brandSettings.tabs.compliance') }}
    .notice
      IconAlertTriangleFilled
      span {{ t('brandSettings.complianceNotice') }}
    .field
      label(for="brand-portrait-consent") {{ t('brandSettings.fields.portraitConsent') }}
      textarea#brand-portrait-consent(v-model="portraitConsent" rows="4")
    .field
      label(for="brand-image-license") {{ t('brandSettings.fields.imageLicense') }} #[small {{ imageLicense.length }} / 200]
      input#brand-image-license(v-model="imageLicense" maxlength="200")

  footer.brand__foot
    span(v-if="saved" role="status" aria-live="polite") {{ t('common.saved') }}
    AppButton(variant="outline" @click="store.load(true)") {{ t('common.cancel') }}
    AppButton(:loading="saving" @click="onSave") {{ saving ? t('common.saving') : t('brandSettings.save') }}
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useBrandStore } from '@/stores/brand'
import AppButton from '@/components/AppButton.vue'
import AppTab from '@/components/AppTab.vue'
import IconAlertTriangleFilled from '@/components/icons/IconAlertTriangleFilled.vue'
import IconChevronDown from '@/components/icons/IconChevronDown.vue'
import IconImagePlaceholder from '@/components/icons/IconImagePlaceholder.vue'
import { extractColors } from '@/utils/colors'
const store = useBrandStore()
const { profile, saving } = storeToRefs(store)
const { t } = useI18n()
const tabs = computed(() =>
  ['basic', 'visual', 'copy', 'compliance'].map((value) => ({ value, label: t(`brandSettings.tabs.${value}`) })),
)
const tab = ref('basic')
const saved = ref(false)
const toneOptions = computed(() =>
  ['warm', 'literary', 'professional', 'playful', 'minimal', 'luxury'].map((key) => t(`brandSettings.tones.${key}`)),
)
const colorLabels = computed(() => ['primary', 'secondary', 'accent'].map((key) => t(`brandSettings.color.${key}`)))
const industries = computed(() =>
  ['服飾 · 生活選物', '美妝保養', '食品餐飲', '其他'].map((value, index) => ({
    value,
    label: t(`brandSettings.industries.${index}`),
  })),
)
const addressingOptions = computed(() =>
  ['你', '您', '親愛的顧客'].map((value, index) => ({ value, label: t(`brandSettings.addressing.${index}`) })),
)
const portraitConsent = ref(t('brandSettings.defaults.portraitConsent'))
const imageLicense = ref(t('brandSettings.defaults.imageLicense'))
const detectedColors = ref<string[]>([])
const selectedColor = ref('')
const analyzing = ref(false)
const paletteError = ref('')
const addingTag = ref(false),
  newTag = ref(''),
  tagInput = ref<HTMLInputElement | null>(null)
onMounted(store.load)
function toggleTone(t: string) {
  if (!profile.value) return
  const i = profile.value.tones.indexOf(t)
  if (i >= 0) profile.value.tones.splice(i, 1)
  else profile.value.tones.push(t)
}
function removeHashtag(i: number) {
  profile.value?.hashtags.splice(i, 1)
}
async function startAddTag() {
  addingTag.value = true
  await nextTick()
  tagInput.value?.focus()
}
function confirmAddTag() {
  let t = newTag.value.trim()
  if (profile.value && t) {
    if (!t.startsWith('#')) t = '#' + t
    if (!profile.value.hashtags.includes(t)) profile.value.hashtags.push(t)
  }
  addingTag.value = false
  newTag.value = ''
}
function addColor() {
  profile.value?.colors.push({ label: t('brandSettings.color.new'), hex: '#ffffff' })
}
async function onLogo(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f || !profile.value) return
  analyzing.value = true
  paletteError.value = ''
  detectedColors.value = []
  selectedColor.value = ''
  profile.value.logoName = f.name
  try {
    const [logoUrl, colors] = await Promise.all([fileToDataUrl(f), extractColors(f, 8)])
    profile.value.logoUrl = logoUrl
    detectedColors.value = colors
    selectedColor.value = colors[0] ?? ''
    if (!colors.length) paletteError.value = t('brandSettings.palette.noColors')
  } catch {
    paletteError.value = t('brandSettings.palette.failed')
  } finally {
    analyzing.value = false
  }
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
function assignColor(index: number) {
  if (!profile.value || !selectedColor.value) return
  while (profile.value.colors.length <= index) {
    profile.value.colors.push({ label: colorLabels.value[profile.value.colors.length] ?? '', hex: '#FFFFFF' })
  }
  const previousIndex = profile.value.colors.findIndex(
    (color, colorIndex) => colorIndex !== index && color.hex.toUpperCase() === selectedColor.value,
  )
  if (previousIndex >= 0) {
    profile.value.colors[previousIndex].hex = profile.value.colors[index].hex
  }
  profile.value.colors[index].hex = selectedColor.value
}
async function onSave() {
  await store.save()
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}
</script>

<style scoped lang="scss">
.brand {
  width: 100%;
  color: $dark-blue-gray;

  &__head {
    height: 3.125rem;
  }

  &__title {
    color: $blue-dark-500;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.8125rem;
  }

  &__subtitle {
    margin-top: 0.125rem;
    color: #606692;
    font-size: 0.875rem;
    line-height: 1.1875rem;
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1rem;

    span {
      color: #45b85b;
      font-size: 0.75rem;
    }
  }
}

.brandTabs {
  display: flex;
  gap: 1.5rem;
  height: 1.5625rem;
  margin: 1rem 0;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid $gray;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  :deep(.appTab) {
    flex-shrink: 0;
    height: 1.5625rem;
    line-height: 1.0625rem;
    white-space: nowrap;
  }
}

.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  padding: 1.5rem;
  border-radius: 10px;
  background: $white;
  box-shadow: 0 4px 7px rgba(96, 100, 114, 0.2);

  &__head {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;

    h2 {
      color: $blue-dark-500;
      font-size: 1.125rem;
      font-weight: 700;
      line-height: 1.375rem;
    }
  }

  &__sub {
    color: $gray-100;
    font-size: 0.75rem;
    line-height: 0.9375rem;
  }
}

.card--visual .card__head h2,
.card--copy .card__head h2 {
  line-height: 1.3125rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow: hidden;

  > label:not(.logo) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: $dark-blue-gray;
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1.25rem;

    small {
      color: $gray-100;
      font-size: 0.75rem;
      font-weight: 400;
      line-height: normal;
    }
  }

  input:not([type='color']):not([type='file']),
  textarea,
  select {
    width: 100%;
    border: 1px solid $gray;
    border-radius: 18px;
    outline: none;
    background: $white;
    color: $gray-100;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 400;

    &:focus-visible {
      outline: 2px solid $yellow;
      outline-offset: 2px;
    }
  }

  input:not([type='color']):not([type='file']) {
    height: 2.0625rem;
    padding: 0.5rem 0.875rem;
  }

  textarea {
    width: 12.5rem;
    max-width: 100%;
    padding: 0.75rem;
    border: 0;
    border-radius: 8px;
    background: $blue-light;
    color: $dark-blue-gray;
    line-height: 1.25rem;
    resize: none;
  }
}

.selectWrap {
  position: relative;

  select {
    height: 2.75rem;
    padding: 0.75rem 2.75rem 0.75rem 0.75rem;
    appearance: none;
    border: 0;
    border-radius: 8px;
    background: $blue-light;
    color: $dark-blue-gray;
    line-height: 1.25rem;
  }

  svg {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    width: 1.25rem;
    height: 1.25rem;
    color: $dark-blue-gray;
    pointer-events: none;
    transform: translateY(-50%);
  }
}

.logo {
  display: flex !important;
  align-items: center;
  justify-content: flex-start !important;
  gap: 0.75rem;
  padding: 0.9375rem 1rem;
  border: 1px dashed #d2d5dd;
  border-radius: 8px;
  cursor: pointer;

  input {
    display: none;
  }

  > svg {
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
  }

  &__copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;

    strong {
      color: $blue-dark-500;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    span {
      color: $gray-100;
      font-size: 0.75rem;
      line-height: 1rem;
    }
  }
}

.swatches {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  overflow-x: auto;
}

.paletteStatus {
  color: #606692;
  font-size: 0.75rem;
  line-height: 1rem;

  &--error {
    color: #d93e28;
  }
}

.detectedPalette {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  background: $blue-light;

  &__head {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;

    strong {
      color: $blue-dark-500;
      font-size: 0.875rem;
      line-height: 1.25rem;
    }

    span {
      color: #606692;
      font-size: 0.75rem;
      line-height: 1rem;
    }
  }

  &__colors,
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__assign {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    color: #606692;
    font-size: 0.75rem;
    line-height: 1rem;
  }
}

.detectedColor {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0.375rem 0.625rem;
  border: 1px solid #d2d5dd;
  border-radius: 8px;
  background: $white;
  color: #606692;
  font-size: 0.75rem;
  line-height: 1rem;

  &__sample {
    width: 1.75rem;
    height: 1.75rem;
    flex-shrink: 0;
    border: 1px solid #d2d5dd;
    border-radius: 6px;
  }

  &.isSelected {
    border-color: $blue-dark-500;
    box-shadow: 0 0 0 1px $blue-dark-500;
  }

  &:focus-visible {
    outline: 2px solid $yellow;
    outline-offset: 2px;
  }
}

.swatch {
  display: flex;
  flex: 0 0 6.25rem;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  color: #606692;
  font-size: 0.75rem;
  line-height: 1rem;

  input,
  &__color {
    width: 3rem;
    height: 3rem;
    padding: 0;
    overflow: hidden;
    appearance: none;
    border: 1px solid $blue-light;
    border-radius: 8px;
    background: $white;
  }

  input::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  input::-webkit-color-swatch {
    border: 0;
  }

  input::-moz-color-swatch {
    border: 0;
  }

  &__name {
    color: #606692;
    font-weight: 400;
  }

  > span:last-child:not(.swatch__name) {
    color: $gray-100;
  }

  &--add {
    border: 0;
    background: transparent;

    &:focus-visible {
      outline: 2px solid $yellow;
      outline-offset: 2px;
    }
  }
}

.chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip {
  height: 1.375rem;
  padding: 0.1875rem 0.75rem;
  border: 1px solid #d2d5dd;
  border-radius: 16px;
  background: $white;
  color: #606692;
  font-size: 0.8125rem;
  line-height: 0.875rem;

  &.active {
    border-color: #606692;
    color: $blue-dark-500;
  }

  &--add {
    height: 2rem;
    padding: 0.375rem 0.875rem;
    border-color: $gray-100;
    border-style: dashed;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  &:focus-visible {
    outline: 2px solid $yellow;
    outline-offset: 2px;
  }
}

.tag {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 1.75rem;
  padding: 0 0.75rem;
  border-radius: 14px;
  background: #f6eac1;
  color: $orange;
  font-size: 0.875rem;
  line-height: 1.25rem;

  &__remove {
    position: absolute;
    top: -0.375rem;
    right: -0.375rem;
    display: grid;
    width: 1rem;
    height: 1rem;
    place-items: center;
    border: 1px solid $gray;
    border-radius: 50%;
    opacity: 0;
    background: $white;
    color: $dark-blue-gray;
    font-size: 0.75rem;
    line-height: 1;
    transition: opacity 0.15s;
  }

  &:hover &__remove,
  &__remove:focus-visible {
    opacity: 1;
  }
}

.tagInput {
  max-width: 12.5rem;
  height: 2rem !important;
}

.notice {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 0.875rem;
  border-left: 3px solid #f2bb00;
  border-radius: 8px;
  background: $blue-light;
  color: $dark-blue-gray;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: normal;

  svg {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    color: $yellow;
  }
}

.card--copy textarea {
  height: 5rem;
  color: $gray-100;
}

.card--compliance textarea {
  height: 5.5rem;
}

@media (max-width: $bp-md) {
  .brand {
    &__head {
      height: auto;
    }

    &__foot {
      flex-wrap: wrap;
    }
  }

  .brandTabs {
    margin: 0.75rem 0 1rem;
  }

  .card {
    padding: 1rem;
  }

  .field textarea {
    width: 100%;
  }

  .logo__copy {
    white-space: normal;
  }
}
</style>
