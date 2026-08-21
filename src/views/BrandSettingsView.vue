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
      label(for="brand-name")
        span.field__labelWrap
          span {{ t('brandSettings.fields.name') }}
          span.field__required(aria-hidden="true") *
          span.visuallyHidden {{ t('brandSettings.required') }}
        small {{ profile.name.length }} / 20
      input#brand-name(v-model="profile.name" maxlength="20" :placeholder="t('brand.name')")
    .field
      label(for="brand-positioning")
        span.field__labelWrap
          span {{ t('brandSettings.fields.positioning') }}
          span.field__required(aria-hidden="true") *
          span.visuallyHidden {{ t('brandSettings.required') }}
        small {{ profile.positioning.length }} / 30
      input#brand-positioning(v-model="profile.positioning" maxlength="30" :placeholder="t('brandSettings.placeholders.positioning')")
    .field
      label(for="brand-website")
        span.field__labelWrap
          span {{ t('brandSettings.fields.website') }}
          span.field__optional {{ t('brandSettings.optional') }}
      input#brand-website(v-model="profile.website" inputmode="url" placeholder="www.rihan-select.com")
    .field.field--industry
      label(for="brand-industry")
        span.field__labelWrap
          span {{ t('brandSettings.fields.industry') }}
          span.field__required(aria-hidden="true") *
          span.visuallyHidden {{ t('brandSettings.required') }}
      //- 設計稿 dropdown_產業別（node 1139:716）有搜尋框、分組標頭、選中打勾與底部提示，
      //- 原生 select 的 option 由作業系統繪製做不出來，因此與字型選單一樣自訂 listbox。
      .industrySelect(ref="industrySelectEl")
        button#brand-industry.industrySelect__trigger(
          type="button"
          aria-haspopup="listbox"
          :aria-expanded="industryMenuOpen"
          :class="{ isOpen: industryMenuOpen }"
          @click="toggleIndustryMenu"
        )
          span.industrySelect__value {{ selectedIndustryLabel }}
          IconChevronDown(:class="{ isUp: industryMenuOpen }")
        .industryMenu(v-if="industryMenuOpen")
          .industryMenu__search
            AppSearchbar.industryMenu__searchbar(
              v-model="industryQuery"
              :label="t('brandSettings.industrySearchLabel')"
              :placeholder="t('brandSettings.industrySearch')"
            )
          .industryMenu__scroll
            .industryMenu__list(role="listbox" :aria-label="t('brandSettings.fields.industry')")
              template(v-for="group in filteredIndustryGroups" :key="group.id")
                .industryMenu__group {{ t(`brandSettings.industryGroups.${group.id}`) }}
                button.industryMenu__item(
                  v-for="option in group.options"
                  :key="option"
                  type="button"
                  role="option"
                  :aria-selected="option === profile.industry"
                  :class="{ isSelected: option === profile.industry }"
                  @click="selectIndustry(option)"
                )
                  span.industryMenu__name {{ t(`brandSettings.industries.${option}`) }}
                  IconCheckCircle.industryMenu__check(v-if="option === profile.industry")
              p.industryMenu__empty(v-if="!filteredIndustryGroups.length") {{ t('brandSettings.industryEmpty') }}
            span.industryMenu__fade(aria-hidden="true")
          p.industryMenu__foot {{ t('brandSettings.industryFoot') }}

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
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useBrandStore } from '@/stores/brand'
import AppButton from '@/components/AppButton.vue'
import AppSearchbar from '@/components/AppSearchbar.vue'
import AppTab from '@/components/AppTab.vue'
import IconAlertTriangleFilled from '@/components/icons/IconAlertTriangleFilled.vue'
import IconCheckCircle from '@/components/icons/IconCheckCircle.vue'
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
// 22 個產業別分五組，逐項對齊 Figma dropdown_產業別（node 1139:716）。
// 存進 BrandProfile.industry 的是這裡的英文 id，不是翻譯後的標籤，避免語系切換改變資料。
const industryGroups = [
  {
    id: 'retail',
    options: ['apparel', 'beauty', 'lifestyle', 'electronics', 'jewelry', 'baby', 'sports', 'pet'],
  },
  { id: 'food', options: ['restaurant', 'groceryGift', 'beverage'] },
  { id: 'health', options: ['medicalAesthetics', 'pharmacy', 'fitness'] },
  { id: 'service', options: ['travel', 'education', 'salon', 'professional', 'realEstate'] },
  { id: 'other', options: ['manufacturing', 'nonprofit', 'other'] },
] as const
const industryIds = industryGroups.flatMap((group) => group.options as readonly string[])
const industryMenuOpen = ref(false)
const industryQuery = ref('')
const industrySelectEl = ref<HTMLElement | null>(null)
const selectedIndustryLabel = computed(() => {
  const current = profile.value?.industry ?? ''
  // 舊資料可能存的是中文標籤而非 id，找不到對應 key 時直接顯示原值，不要吐出 i18n key
  return industryIds.includes(current) ? t(`brandSettings.industries.${current}`) : current
})
const filteredIndustryGroups = computed(() => {
  const keyword = industryQuery.value.trim().toLowerCase()
  return industryGroups
    .map((group) => ({
      id: group.id,
      options: (group.options as readonly string[]).filter(
        (option) => !keyword || t(`brandSettings.industries.${option}`).toLowerCase().includes(keyword),
      ),
    }))
    .filter((group) => group.options.length > 0)
})
async function toggleIndustryMenu() {
  industryMenuOpen.value = !industryMenuOpen.value
  if (!industryMenuOpen.value) return
  industryQuery.value = ''
  await nextTick()
  industrySelectEl.value?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
}
function selectIndustry(id: string) {
  if (profile.value) profile.value.industry = id
  industryMenuOpen.value = false
}
function onIndustryPointerDown(event: MouseEvent) {
  if (!industryMenuOpen.value) return
  if (industrySelectEl.value?.contains(event.target as Node)) return
  industryMenuOpen.value = false
}
function onIndustryKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && industryMenuOpen.value) industryMenuOpen.value = false
}
document.addEventListener('pointerdown', onIndustryPointerDown)
document.addEventListener('keydown', onIndustryKeydown)
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onIndustryPointerDown)
  document.removeEventListener('keydown', onIndustryKeydown)
})
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

    // 必填星號與「選填」標記（對齊 Figma sec_品牌基本資料，node 239:2775 的 label_wrap）
    .field__labelWrap {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .field__required {
      color: #ff6148;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: normal;
    }

    .field__optional {
      color: $gray-100;
      font-size: 0.6875rem;
      font-weight: 500;
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

// 產業別下拉面板要溢出卡片，因此這條路徑上的 overflow 不能是 hidden
.card--basic {
  overflow: visible;
}

.field--industry {
  overflow: visible;
}

// 對齊 Figma dropdown_產業別（node 1139:716，420 × 325）
.industrySelect {
  position: relative;

  &__trigger {
    display: flex;
    width: 100%;
    height: 2.75rem;
    align-items: center;
    padding: 0 0.75rem;
    border: 0;
    border-radius: 8px;
    background: $blue-light;
    color: $dark-blue-gray;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 400;
    gap: 0.5rem;
    line-height: 1.25rem;
    text-align: left;

    svg {
      width: 1.25rem;
      height: 1.25rem;
      flex: none;
      color: $dark-blue-gray;
      pointer-events: none;
      transition: transform 0.15s ease;
    }

    svg.isUp {
      transform: rotate(180deg);
    }

    &:focus-visible {
      outline: 2px solid $yellow;
      outline-offset: 2px;
    }
  }

  &__value {
    overflow: hidden;
    flex: 1;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.industryMenu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 0.25rem);
  left: 0;
  width: 26.25rem;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid $gray;
  border-radius: 0.625rem;
  background: $white;
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.16);

  &__search {
    padding: 0.75rem 0.875rem 0.625rem;
  }

  &__searchbar {
    width: 100%;
  }

  &__scroll {
    position: relative;
  }

  &__list {
    display: flex;
    height: 14.75rem;
    flex-direction: column;
    padding: 0 0.5rem 0.5rem;
    gap: 0.125rem;
    overflow-x: hidden;
    overflow-y: auto;
  }

  &__group {
    color: $gray-100;
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: normal;
  }

  &__item {
    display: flex;
    width: 100%;
    align-items: center;
    padding: 0.4375rem 0.625rem;
    border: 0;
    border-radius: 0.375rem;
    margin: 0;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    gap: 0.5rem;
    text-align: left;

    &.isSelected {
      background: $blue-light;
    }

    // 設計稿沒有畫 hover 狀態，這是實作補的
    &:hover:not(.isSelected) {
      background: #f7f8fc;
    }

    &:focus-visible {
      outline: 2px solid $yellow;
      outline-offset: -2px;
    }
  }

  &__name {
    overflow: hidden;
    flex: 1;
    min-width: 0;
    color: $blue-dark-500;
    font-size: 0.8125rem;
    font-weight: 400;
    line-height: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__item.isSelected &__name {
    font-weight: 500;
  }

  &__check {
    width: 0.9375rem;
    height: 0.9375rem;
    flex: none;
  }

  &__empty {
    padding: 0.4375rem 0.625rem;
    margin: 0;
    color: $gray-100;
    font-size: 0.8125rem;
    line-height: normal;
  }

  // 漸層遮罩要放在捲動容器之外，否則會跟著內容一起捲走
  &__fade {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 1.375rem;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0), $white);
    pointer-events: none;
  }

  &__foot {
    padding: 0.625rem 0.875rem 0.75rem;
    border-top: 1px solid $gray;
    margin: 0;
    color: $gray-100;
    font-size: 0.6875rem;
    line-height: normal;
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
