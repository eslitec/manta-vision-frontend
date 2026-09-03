<template lang="pug">
.calPanel
  .calPanel__inputs
    .fieldBox.fieldBox--active
      span.fieldBox__label {{ t('usage.customRange.start') }}
      .fieldBox__value {{ formatBoxDate(draftStart) }}
    .fieldBox
      span.fieldBox__label {{ t('usage.customRange.end') }}
      .fieldBox__value {{ formatBoxDate(draftEnd) }}
  .calPanel__months
    .calMonth(v-for="m in months" :key="m.key")
      .calMonth__head
        button.calMonth__nav(type="button" @click="prevMonth" :aria-label="t('usage.customRange.prevMonth')")
          IconBack
        span.calMonth__grow
        strong.calMonth__label {{ m.label }}
        span.calMonth__grow
        button.calMonth__nav(type="button" @click="nextMonth" :aria-label="t('usage.customRange.nextMonth')")
          IconNext
      .calMonth__weekdays
        span.calMonth__wd(v-for="(wd, wi) in weekdayLabels" :key="wi") {{ wd }}
      .calMonth__grid
        template(v-for="cell in m.days" :key="cell.key")
          span.day.day--blank(v-if="cell.blank" aria-hidden="true")
          button.day(v-else type="button" :class="dayClass(cell.iso)" @click="pickDay(cell.iso)") {{ cell.day }}
  .calPanel__quick
    button.quickChip(v-for="(label, index) in quickLabels" :key="index" type="button" @click="applyPreset(index)") {{ label }}
  .calPanel__actions
    span.calPanel__hint {{ t('usage.customRange.maxRangeHint', { days: maxRangeDays }) }}
    span.calPanel__grow
    AppButton(variant="outline" @click="emit('cancel')") {{ t('common.cancel') }}
    AppButton(variant="primary" :disabled="!draftValid" @click="apply") {{ t('usage.customRange.apply') }}
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import { IconBack, IconNext } from '@/components/icons'

// panel_calendar（Figma node 1151:862）：雙月曆日期區間挑選面板，取代原本裸的
// <input type="date"> 雙欄位。父層（UsageView.vue）只在按下「套用」時才拿到最終
// start/end，過程中的選取狀態（draftStart/draftEnd）完全是這個元件自己的內部狀態，
// 跟 ImagePickerDialog 用 v-if 每次重新掛載來重置狀態是同一種模式。
const props = withDefaults(defineProps<{ start: string; end: string; maxRangeDays?: number }>(), {
  maxRangeDays: 365,
})
const emit = defineEmits<{ (e: 'apply', start: string, end: string): void; (e: 'cancel'): void }>()

const { t, tm } = useI18n()

function pad(value: number) {
  return String(value).padStart(2, '0')
}
function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
function startOfMonth(iso: string) {
  const [y, m] = iso.split('-').map(Number)
  return new Date(y, m - 1, 1)
}
function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

const draftStart = ref(props.start)
const draftEnd = ref(props.end)
// 兩個月曆永遠相鄰（左月 / 左月+1），任一顆 ic_back／ic_next 都一起連動，
// 對齊設計稿雙月曆並排、但只代表同一組導覽狀態的用法。
const baseMonth = ref(startOfMonth(props.start || toIso(new Date())))
const rightMonth = computed(() => addMonths(baseMonth.value, 1))
function prevMonth() {
  baseMonth.value = addMonths(baseMonth.value, -1)
}
function nextMonth() {
  baseMonth.value = addMonths(baseMonth.value, 1)
}

interface DayCell {
  key: string
  day: number
  iso: string
  blank?: boolean
}
function monthDays(monthDate: Date): DayCell[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const blanks: DayCell[] = Array.from({ length: firstWeekday }, (_, i) => ({
    key: `blank-${i}`,
    day: 0,
    iso: '',
    blank: true,
  }))
  const days: DayCell[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    return { key: `${year}-${pad(month + 1)}-${pad(day)}`, day, iso: `${year}-${pad(month + 1)}-${pad(day)}` }
  })
  return [...blanks, ...days]
}
function monthLabel(date: Date) {
  return t('usage.customRange.monthLabel', { year: date.getFullYear(), month: date.getMonth() + 1 })
}
const months = computed(() => [
  { key: 'left', label: monthLabel(baseMonth.value), days: monthDays(baseMonth.value) },
  { key: 'right', label: monthLabel(rightMonth.value), days: monthDays(rightMonth.value) },
])
const weekdayLabels = computed(() => tm('usage.customRange.weekdays') as string[])
const quickLabels = computed(() => tm('usage.customRange.quick') as string[])

function formatBoxDate(iso: string) {
  return iso ? iso.replaceAll('-', '/') : ''
}

// 未選取（out）：灰字、無底色；區間內（inRange）：淺藍底、深藍字、無圓角（讓相鄰
// 日期的底色連成一整條）；起訖端點（endpoint）：深藍底、白色粗體字、8px 圓角。
function cellState(iso: string): 'out' | 'inRange' | 'endpoint' {
  if (!draftStart.value) return 'out'
  const inRange = draftEnd.value ? iso >= draftStart.value && iso <= draftEnd.value : iso === draftStart.value
  if (!inRange) return 'out'
  return iso === draftStart.value || iso === draftEnd.value ? 'endpoint' : 'inRange'
}
function dayClass(iso: string) {
  const state = cellState(iso)
  return { 'day--inRange': state === 'inRange', 'day--endpoint': state === 'endpoint' }
}
function pickDay(iso: string) {
  if (!draftStart.value || draftEnd.value) {
    draftStart.value = iso
    draftEnd.value = ''
    return
  }
  if (iso < draftStart.value) {
    draftEnd.value = draftStart.value
    draftStart.value = iso
  } else {
    draftEnd.value = iso
  }
}

const draftValid = computed(() => {
  if (!draftStart.value || !draftEnd.value) return false
  const days = Math.round((Date.parse(draftEnd.value) - Date.parse(draftStart.value)) / 86400000) + 1
  return days > 0 && days <= props.maxRangeDays
})
function apply() {
  if (!draftValid.value) return
  emit('apply', draftStart.value, draftEnd.value)
}

// 快速選取：past7／lastMonth／thisQuarter／ytd，跟畫面上 quick_過去 7 天／
// quick_上個月／quick_本季／quick_今年至今 四個 chip 依序對應（index 0-3）。
function applyPreset(index: number) {
  const today = new Date()
  let start = today
  let end = today
  if (index === 0) {
    start = new Date(today)
    start.setDate(start.getDate() - 6)
  } else if (index === 1) {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    end = new Date(today.getFullYear(), today.getMonth(), 0)
  } else if (index === 2) {
    start = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
  } else {
    start = new Date(today.getFullYear(), 0, 1)
  }
  draftStart.value = toIso(start)
  draftEnd.value = toIso(end)
  baseMonth.value = startOfMonth(draftStart.value)
}
</script>

<style scoped lang="scss">
// 對齊 Figma panel_calendar（node 1151:862），以 UsageView.vue 的 .customRange 為錨點
// 往下浮出的下拉面板。
.calPanel {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  z-index: 30;
  display: flex;
  width: 33rem;
  max-width: calc(100vw - 2rem);
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1rem 0.875rem;
  border: 1px solid $gray;
  border-radius: 12px;
  background: $white;
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.16);
  color: $dark-blue-gray;
}
.calPanel__inputs {
  @include flex(flex-start, center, 0.625rem);
  width: 100%;
}
.fieldBox {
  display: flex;
  min-width: 0;
  flex: 1 0 0;
  flex-direction: column;
  gap: 0.25rem;
}
.fieldBox__label {
  color: $gray-100;
  font-size: 0.6875rem;
}
.fieldBox__value {
  box-sizing: border-box;
  width: 100%;
  min-height: 1.125rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid $gray;
  border-radius: 8px;
  color: $blue-dark-500;
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
}
.fieldBox--active .fieldBox__value {
  border-color: $blue-dark-500;
}
.calPanel__months {
  @include flex(flex-start, flex-start, 1.25rem);
}
.calMonth {
  @include flex(flex-start, center, 0.5rem);
  flex-direction: column;
  width: 14.875rem;
}
.calMonth__head {
  @include flex(flex-start, center, 0.5rem);
  width: 100%;
}
.calMonth__nav {
  @include flex(center, center);
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  color: $blue-dark-500;

  svg {
    width: 100%;
    height: 100%;
  }
}
.calMonth__grow {
  height: 1px;
  flex: 1 0 0;
}
.calMonth__label {
  flex-shrink: 0;
  color: $blue-dark-500;
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
}
.calMonth__weekdays {
  display: flex;
  width: 100%;
}
.calMonth__wd {
  @include flex(center, center);
  width: 2.125rem;
  height: 1.375rem;
  flex-shrink: 0;
  color: $gray-100;
  font-size: 0.6875rem;
}
.calMonth__grid {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
}
.day {
  @include flex(center, center);
  width: 2.125rem;
  height: 2rem;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: $gray-100;
  font-size: 0.75rem;

  &--blank {
    visibility: hidden;
  }

  &--inRange {
    border-radius: 0;
    background: $blue-light;
    color: $blue-dark-500;
  }

  &--endpoint {
    background: $blue-dark-500;
    color: $white;
    font-weight: 700;
  }
}
.calPanel__quick {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.quickChip {
  @include flex(center, center);
  padding: 0.375rem 0.75rem;
  border: 1px solid $gray;
  border-radius: 18px;
  background: $white;
  color: $dark-blue-gray;
  font-size: 0.875rem;
  white-space: nowrap;
}
.calPanel__actions {
  @include flex(flex-start, center, 0.625rem);
  width: 100%;
}
.calPanel__hint {
  flex-shrink: 0;
  color: $gray-100;
  font-size: 0.6875rem;
}
.calPanel__grow {
  height: 1px;
  flex: 1 0 0;
}
</style>
