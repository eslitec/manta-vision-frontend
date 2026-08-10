<template lang="pug">
.post
  section.panel.post__input
    .step
      .step__title {{ t('marketing.steps.image') }}
      .dropzone
        i.ti.ti-photo.dropzone__icon
        span.dropzone__name(v-if="productImage") {{ productImage.name }}
      .dropzone__actions
        OutlineButton(@click="pickerOpen = true") {{ t('common.selectFromLibrary') }}
    .step
      .step__title {{ t('marketing.steps.intro') }}
      .field
        textarea.field__input(v-model="intro" maxlength="200" rows="4" :placeholder="t('marketing.introPlaceholder')")
        span.field__counter {{ intro.length }} / 200
      .insp
        button.insp__pill(@click="inspOpen = !inspOpen") {{ t('marketing.inspiration') }}
        span.insp__hint {{ t('marketing.inspirationHint') }}
    BrandToggle.post__brand(
      v-model="applyBrand"
      :description="t('marketing.brandDescription')"
      @edit="goBrandSettings"
    )
    .step
      .step__title {{ t('marketing.steps.ratio') }}
      .ratios
        button.ratiocard(v-for="r in ratios" :key="r.v" :class="{ 'isActive': ratio === r.v }" @click="ratio = r.v")
          span.ratiocard__label {{ r.label }}
          span.ratiocard__desc {{ r.desc }}
    p.err(v-if="errorMsg") {{ errorMsg }}
    .post__footer
      .cost
        .cost__label {{ t('common.estimatedCost') }}
        .cost__value
          IconFeedBottleSmall.cost__icon
          span {{ t('units.feed', { count: 5 }) }}
      PrimaryButton(:disabled="generating" @click="generate")
        i.ti(:class="generating ? 'ti-loader spin' : 'ti-plus'")
        span {{ generating ? t('common.generating') : t('marketing.generate') }}

  section.panel.post__result
    h2.result__title {{ t('common.generationResult') }}
    .result__empty(v-if="!result") {{ t('marketing.emptyResult') }}
    template(v-else)
      .postresult
        .postresult__col
          .poster(:style="{ aspectRatio: aspect }")
            i.ti.ti-photo
          .postresult__act
            button.linkbtn(@click="generate") {{ t('marketing.changeImage') }}
            button.linkbtn(@click="downloadPoster") {{ t('common.download') }}
        .postresult__col
          .copy
            p.copy__text(v-for="(line, i) in copyLines" :key="i") {{ line }}
            p.copy__tags {{ result.hashtags.join(' ') }}
          .postresult__act
            OutlineButton(@click="copyText")
              i.ti.ti-copy
              span {{ copied ? t('common.copied') : t('marketing.copyText') }}
            button.linkbtn(@click="generate") {{ t('marketing.rewrite') }}
      .postresult__note
        i.ti.ti-alert-triangle.postresult__noteIcon
        span {{ t('marketing.nextStep') }}

  ImagePickerDialog(v-model:open="pickerOpen" :title="t('marketing.pickerTitle')" @select="onPick")
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ImagePickerDialog from '@/components/ImagePickerDialog.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import OutlineButton from '@/components/OutlineButton.vue'
import BrandToggle from '@/components/BrandToggle.vue'
import IconFeedBottleSmall from '@/components/icons/IconFeedBottleSmall.vue'
import { useFeedStore } from '@/stores/feed'
import { api } from '@/api'
import { isInsufficientFeed } from '@/utils/error'
import type { Asset, GeneratedPost } from '@/types/api'

const router = useRouter()
const feed = useFeedStore()
const { t } = useI18n()

const productImage = ref<Asset | null>(null)
const intro = ref('')
const applyBrand = ref(true)
const inspOpen = ref(false)
const pickerOpen = ref(false)
const generating = ref(false)
const errorMsg = ref('')
const result = ref<GeneratedPost | null>(null)
const copied = ref(false)

// 輸出比例（生成前於設定區選定，影響構圖與結果預覽比例）
const ratios = computed(() => [
  { v: '1:1', label: '1:1', desc: t('marketing.ratios.post'), ar: '1 / 1' },
  { v: '16:9', label: '16:9', desc: t('marketing.ratios.banner'), ar: '16 / 9' },
  { v: '9:16', label: '9:16', desc: t('marketing.ratios.story'), ar: '9 / 16' },
])
const ratio = ref('1:1')
const aspect = computed(() => ratios.value.find((r) => r.v === ratio.value)?.ar ?? '1 / 1')

const goBrandSettings = () => router.push('/settings')
const copyLines = computed(() => (result.value ? result.value.copy.split('\n\n') : []))
const onPick = (a: Asset) => {
  productImage.value = a
}

async function generate() {
  errorMsg.value = ''
  generating.value = true
  copied.value = false
  try {
    result.value = await api.generatePost({
      productImageId: productImage.value?.id,
      intro: intro.value,
      applyBrand: applyBrand.value,
      ratio: ratio.value, // 版位比例一併送給後端，影響構圖
    })
    await feed.refresh()
  } catch (e: unknown) {
    errorMsg.value = isInsufficientFeed(e) ? t('errors.insufficientFeed') : t('errors.generationFailed')
  } finally {
    generating.value = false
  }
}
function downloadPoster() {
  // TODO: 後端回傳 posterUrl 後觸發實際下載
  if (result.value?.posterUrl) window.open(result.value.posterUrl, '_blank')
}
async function copyText() {
  if (!result.value) return
  const text = result.value.copy + '\n\n' + result.value.hashtags.join(' ')
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
  } catch {
    /* noop */
  }
}
</script>

<style scoped lang="scss">
.post {
  display: grid;
  grid-template-columns: 25rem 1fr;
  gap: 1rem;
  align-items: stretch;
  min-height: 100%;
  @include below($bp-lg) {
    grid-template-columns: 1fr;
  }
}
.panel {
  background: $white;
  border-radius: 10px;
  box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2);
  padding: 1.5rem;
}
.post__input {
  display: flex;
  flex-direction: column;
}
.step {
  margin-bottom: 1rem;
  &__title {
    font-size: 1rem;
    font-weight: 700;
    color: $dark-blue-gray;
    margin-bottom: 0.75rem;
  }
}
.dropzone {
  @include flex(center, center);
  flex-direction: column;
  aspect-ratio: 352 / 170;
  border-radius: 8px;
  background: #eef1f7;
  color: $babyBlue;
  font-size: 2.125rem;
  margin-bottom: 0.75rem;
  &__name {
    font-size: 0.8125rem;
    color: $gray-400;
    margin-top: 0.5rem;
  }
  &__actions {
    @include flex(flex-start, center, 0.75rem);
  }
  &__hint {
    font-size: 0.75rem;
    color: #b4b9c4;
  }
}
.field {
  position: relative;
  &__input {
    width: 100%;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 0.875rem;
    font-size: 0.875rem;
    font-family: inherit;
    color: $blue-dark-300;
    resize: vertical;
    outline: none;
    background: $blue-light;
    &::placeholder {
      color: #b4b9c4;
    }
  }
  &__counter {
    position: absolute;
    right: 0.75rem;
    bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: $orange;
  }
}
.insp {
  @include flex(flex-start, center, 0.5rem);
  margin-top: 0.625rem;
  &__pill {
    padding: 0.1875rem 0.75rem;
    border-radius: 16px;
    font-size: 0.8125rem;
    color: $dark-blue-gray;
    background: #f6eac1;
  }
  &__hint {
    font-size: 0.75rem;
    color: $gray-100;
  }
}
.post__brand {
  margin: 1rem 0;
}
.ratios {
  @include flex(flex-start, stretch, 0.5rem);
  flex-wrap: wrap;
}
.ratiocard {
  @include flex(center, center, 0.125rem);
  flex-direction: column;
  width: 7rem;
  height: 3.75rem;
  padding: 0.625rem;
  border: 1px solid #d2d5dd;
  border-radius: 8px;
  background: $white;
  &__label {
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.375;
    color: $dark-blue-gray;
  }
  &__desc {
    font-size: 0.75rem;
    line-height: 1.333;
    color: #606692;
  }
  &.isActive {
    background: $blue-light;
    border: 1.5px solid $blue-dark-500;
    .ratiocard__label {
      color: $blue-dark-500;
    }
  }
}
.err {
  color: $red;
  font-size: 0.8125rem;
  margin: 0.5rem 0;
}
.post__footer {
  @include flex(space-between, flex-end);
  border-top: 1px solid $gray;
  margin: auto -1.5rem 0;
  padding: 0.875rem 1.5rem 0;
}
.cost {
  &__label {
    font-size: 0.75rem;
    color: #b4b9c4;
  }
  &__value {
    @include flex(flex-start, center, 0.25rem);
    font-size: 1rem;
    font-weight: 700;
    color: $dark-blue-gray;
  }
  &__icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }
}
.post__result {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.result__title {
  font-size: 1.125rem;
  font-weight: 700;
  color: $dark-blue-gray;
  margin-bottom: 0;
}
.result__empty {
  color: $gray-100;
  font-size: 0.875rem;
  padding: 2.5rem 0;
  text-align: center;
}
.postresult {
  @include flex(flex-start, flex-start, 1.25rem);
  @include below($bp-sm) {
    flex-direction: column;
  }
}
.postresult__col {
  display: flex;
  flex-direction: column;
  &:first-child {
    width: 18.75rem;
    flex-shrink: 0;
    gap: 0.5rem;
  }
  &:last-child {
    flex: 1;
    min-width: 0;
    gap: 0.75rem;
  }
  @include below($bp-sm) {
    &:first-child {
      width: 100%;
    }
  }
}
.postresult__act {
  @include flex(flex-start, center, 0.75rem);
}
.postresult__note {
  @include flex(flex-start, center, 0.625rem);
  background: $blue-light;
  border-left: 3px solid $babyBlue;
  border-radius: 8px;
  padding: 0.75rem 0.875rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: $dark-blue-gray;
  line-height: 1.5;
  &-icon {
    color: $babyBlue;
    font-size: 1.125rem;
    flex-shrink: 0;
  }
}
.poster {
  @include flex(center, center);
  background: #eef1f7;
  border-radius: 8px;
  color: $babyBlue;
  font-size: 2.75rem;
  width: 100%;
}
.copy {
  background: $blue-light;
  border-radius: 8px;
  padding: 1rem;
  width: 100%;
  &__text {
    font-size: 1rem;
    color: $dark-blue-gray;
    line-height: 1.375;
    margin-bottom: 0.5rem;
  }
  &__tags {
    font-size: 1rem;
    line-height: 1.375;
    color: $dark-blue-gray;
  }
}
.linkbtn {
  font-size: 0.875rem;
  color: #606692;
  padding: 0;
  &:hover {
    color: $blue-dark-500;
  }
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
