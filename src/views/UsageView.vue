<template lang="pug">
.usage
  header.pageHead
    h1 {{ t(`usage.headers.${tab}.title`) }}
    p {{ t(`usage.headers.${tab}.subtitle`) }}
  .tabs(role="tablist" :aria-label="t('routeTitles.usage')")
    button.tabs__item(v-for="item in tabs" :key="item.value" role="tab" :aria-selected="tab === item.value" :class="{ 'isActive': tab === item.value }" @click="tab = item.value") {{ item.label }}
  .range
    span {{ t('usage.period') }}
    button.range__chip(v-for="item in ranges" :key="item.value" :aria-pressed="range === item.value" :class="{ 'isActive': range === item.value }" @click="selectRange(item.value)") {{ item.label }}
    .customRange(v-if="range === 'custom'" ref="customRangeRef")
      button.customRange__trigger(type="button" :aria-expanded="customPanelOpen" @click="customPanelOpen = !customPanelOpen")
        span {{ customRangeTriggerLabel }}
        IconChevronDown.customRange__chevron
      DateRangeCalendarPanel(
        v-if="customPanelOpen"
        :start="customStart"
        :end="customEnd"
        @apply="onApplyCustomRange"
        @cancel="customPanelOpen = false"
      )
    span.range__date {{ periodData.dateLabel }}
    AppButton.range__export(variant="outline" @click="exportUsage") {{ t('usage.export') }}

  template(v-if="tab === 'usage'")
    section.quota(:aria-busy="updating || undefined")
      .quota__row
        .quota__usage
          span.quota__eyebrow {{ t('usage.quota.title') }}
          .quota__value
            IconFeedBottleSmall
            strong {{ formatNumber(periodData.used) }}
            span / {{ formatNumber(periodData.limit) }} {{ t('units.feedShort') }}
            em · {{ periodData.percent }}%
          .gauge
            .gauge__used(:style="{ width: `${Math.min(periodData.percent, 100)}%` }")
            .gauge__forecast(:style="{ left: `${Math.min(periodData.percent, 100)}%`, width: `${forecastWidth}%` }")
            .gauge__threshold(:style="{ left: `${periodData.warningPercent}%` }")
          .gaugeLabels
            span.gaugeLabels__current ● {{ t('usage.quota.currentPercent', { percent: periodData.percent }) }}
            span.gaugeLabels__forecast ● {{ t('usage.quota.forecastPercent', { percent: periodData.forecastPercent }) }}
            span.gaugeLabels__threshold | {{ t('usage.quota.thresholdPercent', { percent: periodData.warningPercent }) }}
            span.gaugeLabels__remaining #[IconFeedBottleSmall] {{ t('usage.quota.remainingValue', { count: formatNumber(periodData.remaining) }) }}
        .quota__stats
          .quota__kpi(v-for="k in quotaKpis" :key="k.label")
            span {{ k.label }}
            strong(:class="k.tone") {{ k.value }}
            small {{ k.hint }}
    .quotaAlert(v-if="usageAlert" role="alert")
      IconAlertTriangleFilled
      span {{ usageAlert }}
    .usageGrid
      section.card.trend
        h2 {{ t('usage.trend.title') }}
        .trendConclusion
          strong {{ t('usage.trend.forecastLeadDynamic', { count: formatNumber(periodData.forecastUsed), percent: periodData.forecastPercent }) }}
          span {{ t('usage.trend.forecastDetailDynamic', { threshold: periodData.warningPercent }) }}
          small {{ t('usage.trend.basis') }}
        .trendChart
          svg.trendChart__plot(viewBox="0 0 678 372" preserveAspectRatio="none" role="img" :aria-label="t('usage.trend.chartLabel', { range: periodData.dateLabel })")
            g.trendChart__grid
              line(v-for="y in [0, 58, 116, 174, 232]" :key="y" x1="46" :y1="y" x2="666" :y2="y")
            line.trendChart__limitLine(x1="46" y1="0" x2="666" y2="0")
            line.trendChart__warningLine(x1="46" :y1="warningY" x2="666" :y2="warningY")
            line.trendChart__todayLine(:x1="todayX" y1="0" :x2="todayX" y2="354")
            path.trendChart__actual(:d="actualPath")
            path.trendChart__forecast(:d="forecastPath")
            circle.trendChart__todayDot(:cx="todayX" :cy="todayY" r="4.5")
            circle.trendChart__forecastDot(cx="666" :cy="forecastY" r="4.5")
            g.trendChart__bars
              rect(v-for="bar in chartBars" :key="bar.x" :x="bar.x" :y="bar.y" :width="bar.width" :height="bar.height" rx="2")
          span.trendChart__label.trendChart__label--y(v-for="tick in yTicks" :key="tick.value" :style="{ top: tick.top }") {{ tick.value }}
          span.trendChart__label.trendChart__label--x(v-for="tick in xTicks" :key="tick.value" :style="{ left: tick.left }") {{ tick.value }}
          span.trendChart__label.trendChart__label--today {{ periodData.todayLabel }}
          span.trendChart__label.trendChart__label--limit {{ t('usage.trend.limitShort') }}
          span.trendChart__label.trendChart__label--threshold {{ t('usage.trend.thresholdShort') }}
        .trendLegend
          span.trendLegend__item(v-for="item in legendItems" :key="item.key")
            img(:src="item.icon" alt="")
            | {{ t(`usage.legend.${item.key}`) }}
      section.card.modules
        h2 {{ t('usage.modules.title') }}
        .module(v-for="m in periodData.modules" :key="m.name")
          .module__summary
            strong {{ m.name }}
            b.module__feed(:class="`module__feed--${m.tone}`")
              IconFeedBottleSmall.module__feedIcon
              | {{ t('units.feed', { count: m.value }) }}
          .module__meta #[span {{ t('usage.modules.share', { share: m.share }) }}] #[span(:class="m.delta.startsWith('-') ? 'down' : 'up'") {{ t('usage.comparedLastMonth', { delta: m.delta }) }}] #[span {{ t('usage.modules.average', { average: m.avg }) }}]
          .module__track: span(:style="{ width: m.share + '%' }")
        p.modules__note {{ t('usage.modules.note') }}

  template(v-else)
    .metrics
      article.metric(v-for="m in metricCards" :key="m.label")
        h2 {{ m.label }}
        .metric__row
          IconFeedBottleSmall.metric__feedIcon(v-if="m.feed")
          strong(:class="m.tone")
            | {{ m.value }}
          span {{ t('usage.metrics.comparedLastMonth', { delta: m.delta }) }}
        p {{ m.hint }}
    .trackingNote
      IconAlertTriangleFilled
      div
        strong {{ t('usage.tracking.title') }}
        p {{ t('usage.tracking.description') }}
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/AppButton.vue'
import DateRangeCalendarPanel from '@/components/DateRangeCalendarPanel.vue'
import { IconAlertTriangleFilled, IconChevronDown, IconFeedBottleSmall } from '@/components/icons'
import { useDismissableMenu } from '@/composables/useDismissableMenu'
import { getUsageAlertLevel } from '@/utils/usage'
import legendActualUrl from '@/assets/images/usage-legend-actual.svg'
import legendForecastUrl from '@/assets/images/usage-legend-forecast.svg'
import legendDailyUrl from '@/assets/images/usage-legend-daily.svg'
import legendWarningUrl from '@/assets/images/usage-legend-warning.svg'
import legendLimitUrl from '@/assets/images/usage-legend-limit.svg'
const { t } = useI18n()
const tabs = computed(() => ['usage', 'metrics'].map((value) => ({ value, label: t(`usage.tabs.${value}`) })))
const tab = ref('usage')
const ranges = computed(() =>
  ['month', 'days30', 'days90', 'custom'].map((value) => ({ value, label: t(`usage.ranges.${value}`) })),
)
const range = ref('month')
const customStart = ref('2026-07-10')
const customEnd = ref('2026-07-28')
const appliedCustomStart = ref(customStart.value)
const appliedCustomEnd = ref(customEnd.value)
const updating = ref(false)
const customPanelOpen = ref(false)
const customRangeRef = ref<HTMLElement | null>(null)
const customRangeTriggerLabel = computed(
  () => `${customStart.value.replaceAll('-', '/')} – ${customEnd.value.replaceAll('-', '/')}`,
)
useDismissableMenu(customPanelOpen, customRangeRef)

type RangeKey = 'month' | 'days30' | 'days90' | 'custom'
interface ModuleUsage {
  name: string
  value: string
  share: number
  delta: string
  avg: number
  tone: 'primary' | 'muted' | 'orange' | 'green'
}

const presetConfig: Record<Exclude<RangeKey, 'custom'>, { start: string; end: string; used: number; limit: number }> = {
  month: { start: '2026-07-01', end: '2026-07-31', used: 3760, limit: 5000 },
  days30: { start: '2026-06-29', end: '2026-07-28', used: 3520, limit: 5000 },
  days90: { start: '2026-05-01', end: '2026-07-29', used: 10840, limit: 15000 },
}

function dayCount(start: string, end: string) {
  return Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1)
}
function makeDaily(days: number, total: number) {
  const weights = Array.from(
    { length: days },
    (_, index) => 0.72 + (index / Math.max(days - 1, 1)) * 0.5 + Math.sin(index * 1.7) * 0.12,
  )
  const sum = weights.reduce((acc, value) => acc + value, 0)
  const values = weights.map((weight) => Math.max(1, Math.round((weight / sum) * total)))
  values[values.length - 1] += total - values.reduce((acc, value) => acc + value, 0)
  return values
}
function formatDate(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}
function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

const customRangeValid = computed(() =>
  Boolean(customStart.value && customEnd.value && customStart.value <= customEnd.value),
)
const periodData = computed(() => {
  const key = range.value as RangeKey
  const config =
    key === 'custom'
      ? { start: appliedCustomStart.value, end: appliedCustomEnd.value, used: 0, limit: 0 }
      : presetConfig[key]
  const days = dayCount(config.start, config.end)
  const used = key === 'custom' ? Math.round((3760 / 31) * days) : config.used
  const limit = key === 'custom' ? Math.max(5000, Math.ceil(used / 5000) * 5000) : config.limit
  const percent = Math.round((used / limit) * 100)
  const forecastUsed = Math.min(limit, Math.round(used * 1.13))
  const forecastPercent = Math.round((forecastUsed / limit) * 100)
  const daily = makeDaily(days, used)
  const moduleRatios = [1580 / 3760, 920 / 3760, 840 / 3760]
  const moduleValues = moduleRatios.map((share) => Math.round(used * share))
  moduleValues.push(used - moduleValues.reduce((sum, value) => sum + value, 0))
  const moduleNames = ['image', 'post', 'video', 'tryOn']
  const tones = ['primary', 'muted', 'orange', 'green'] as const
  const deltas = ['+18%', '+4%', '+62%', '-9%']
  const averages = [12, 8, 45, 15]
  const modules: ModuleUsage[] = moduleNames.map((name, index) => ({
    name: t(`usage.modules.items.${name}`),
    value: String(moduleValues[index]),
    share: [42, 24.5, 22.3, 11.2][index],
    delta: deltas[index],
    avg: averages[index],
    tone: tones[index],
  }))
  return {
    start: config.start,
    end: config.end,
    dateLabel: `${config.start.replaceAll('-', '/')} – ${config.end.replaceAll('-', '/')}`,
    todayLabel: t('usage.trend.latestDate', { date: formatDate(config.end) }),
    used,
    limit,
    percent,
    forecastUsed,
    forecastPercent,
    warningPercent: 80,
    remaining: Math.max(0, limit - used),
    daily,
    modules,
  }
})

async function selectRange(value: string) {
  range.value = value
  if (value === 'custom') {
    // 自訂區間：切到這個 chip（或再次點擊）就打開 panel_calendar 下拉面板，
    // 面板自己的「套用」才會真的觸發資料更新，這裡不用假的 loading 動畫
    customPanelOpen.value = true
    return
  }
  customPanelOpen.value = false
  updating.value = true
  await new Promise((resolve) => setTimeout(resolve, 120))
  updating.value = false
}
async function applyCustomRange() {
  if (!customRangeValid.value) return
  appliedCustomStart.value = customStart.value
  appliedCustomEnd.value = customEnd.value
  updating.value = true
  await new Promise((resolve) => setTimeout(resolve, 120))
  updating.value = false
}
function onApplyCustomRange(start: string, end: string) {
  customStart.value = start
  customEnd.value = end
  customPanelOpen.value = false
  void applyCustomRange()
}

const cumulative = computed(() => {
  let sum = 0
  return periodData.value.daily.map((value) => (sum += value))
})
const actualPointCount = computed(() => Math.max(2, Math.ceil(cumulative.value.length * 0.9)))
function pointAt(index: number, value: number) {
  const x = 46 + (620 * index) / Math.max(cumulative.value.length - 1, 1)
  const y = 232 - (Math.min(value, periodData.value.limit) / periodData.value.limit) * 232
  return { x, y }
}
const actualPoints = computed(() =>
  cumulative.value.slice(0, actualPointCount.value).map((value, index) => pointAt(index, value)),
)
const actualPath = computed(() =>
  actualPoints.value.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '),
)
const todayX = computed(() => actualPoints.value.at(-1)?.x ?? 46)
const todayY = computed(() => actualPoints.value.at(-1)?.y ?? 232)
const forecastY = computed(() => 232 - (periodData.value.forecastUsed / periodData.value.limit) * 232)
const forecastPath = computed(
  () => `M${todayX.value.toFixed(1)} ${todayY.value.toFixed(1)} L666 ${forecastY.value.toFixed(1)}`,
)
const warningY = computed(() => 232 - (periodData.value.warningPercent / 100) * 232)
const usageAlert = computed(() => {
  const { percent, warningPercent } = periodData.value
  const level = getUsageAlertLevel(percent, warningPercent)
  if (level === 'none') return ''
  return t(`usage.quota.${level === 'exceeded' ? 'alertExceeded' : 'alertApproaching'}`, {
    percent,
    threshold: warningPercent,
  })
})
const forecastWidth = computed(() =>
  Math.max(0, Math.min(100 - periodData.value.percent, periodData.value.forecastPercent - periodData.value.percent)),
)
const chartBars = computed(() => {
  const values = periodData.value.daily
  const max = Math.max(...values)
  const width = Math.max(2, Math.min(12, 570 / values.length))
  return values.map((value, index) => {
    const height = 80 * (value / max)
    return { x: 46 + (620 * index) / Math.max(values.length - 1, 1) - width / 2, y: 354 - height, width, height }
  })
})
watch(tab, (value) => {
  range.value = value === 'metrics' ? 'days30' : 'month'
})
const quotaKpis = computed(() =>
  ['daily', 'depletion', 'monthly'].map((key, index) => ({
    label: t(`usage.kpis.${key}.label`),
    value:
      index === 0
        ? formatNumber(Math.round(periodData.value.used / periodData.value.daily.length))
        : index === 1
          ? t('usage.kpis.depletion.value')
          : `${periodData.value.daily.length > 31 ? '+' : ''}${Math.round((periodData.value.used / 3760 - 1) * 100)}%`,
    hint:
      index === 0
        ? t('usage.kpis.daily.dynamicHint', {
            count: formatNumber(Math.round(periodData.value.used / periodData.value.daily.length)),
          })
        : index === 1
          ? t('usage.kpis.depletion.dynamicHint', { count: formatNumber(periodData.value.forecastUsed) })
          : t('usage.kpis.monthly.hint'),
    tone: index === 1 ? 'ok' : index === 2 ? 'warn' : '',
  })),
)
const yTicks = computed(() =>
  [1, 0.75, 0.5, 0.25, 0].map((ratio, index) => ({
    value: formatNumber(Math.round(periodData.value.limit * ratio)),
    top: index === 0 ? '-0.4375rem' : `${((index * 58) / 372) * 100}%`,
  })),
)
const xTicks = computed(() => {
  const start = Date.parse(periodData.value.start)
  const end = Date.parse(periodData.value.end)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start + ((end - start) * index) / 6)
    return { value: `${date.getMonth() + 1}/${date.getDate()}`, left: `${5.53 + index * 15.17}%` }
  })
})
const legendItems = [
  { key: 'actual', icon: legendActualUrl },
  { key: 'forecast', icon: legendForecastUrl },
  { key: 'daily', icon: legendDailyUrl },
  { key: 'warning', icon: legendWarningUrl },
  { key: 'limit', icon: legendLimitUrl },
]
function exportUsage() {
  const rows = [
    [t('usage.exportFields.period'), periodData.value.dateLabel],
    [t('usage.exportFields.used'), periodData.value.used],
    [t('usage.exportFields.limit'), periodData.value.limit],
    [t('usage.exportFields.remaining'), periodData.value.remaining],
    [],
    [t('usage.exportFields.module'), t('usage.exportFields.feed'), t('usage.exportFields.share')],
    ...periodData.value.modules.map((module) => [module.name, module.value, `${module.share}%`]),
  ]
  const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `manta-vision-usage-${periodData.value.start}-${periodData.value.end}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
const metricCards = computed(() =>
  [
    {
      value: `${(95.4 + Math.min(periodData.value.daily.length, 90) / 110).toFixed(1)}%`,
      delta: '+1.8%',
      tone: 'green',
      feed: false,
    },
    {
      value: `${(67.2 + Math.min(periodData.value.daily.length, 90) / 75).toFixed(1)}%`,
      delta: '+4.2%',
      tone: '',
      feed: false,
    },
    {
      value: t('usage.metrics.regenerationValue'),
      delta: t('usage.metrics.regenerationDelta'),
      tone: 'orange',
      feed: false,
    },
    { value: '6.1', delta: t('usage.metrics.costDelta'), tone: 'muted', feed: true },
  ].map((m, index) => ({
    ...m,
    label: t(`usage.metrics.items.${index}.label`),
    hint: t(`usage.metrics.items.${index}.hint`),
  })),
)
</script>

<style scoped lang="scss">
.usage {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  color: #383c4b;
}
.pageHead {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  h1 {
    font-size: 1.5rem;
    color: #2e3567;
    font-weight: 700;
    line-height: 1.8125rem;
  }
  p {
    font-size: 0.875rem;
    color: #606692;
    line-height: 1.0625rem;
  }
}
.tabs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.tabs__item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 0.1875rem 0.75rem;
  border: 1px solid #d2d5dd;
  border-radius: 16px;
  background: white;
  color: #606692;
  font-size: 0.8125rem;
  font-weight: 400;
  white-space: nowrap;

  &.isActive {
    background: #2e3567;
    border-color: #2e3567;
    color: white;
  }
}
.range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  color: #b4b9c4;
  font-size: 0.8125rem;
}
.range__chip {
  box-sizing: border-box;
  background: white;
  border: 1px solid #d2d5dd;
  border-radius: 18px;
  padding: 0.375rem 0.75rem;
  color: #383c4b;
  font-size: 0.875rem;
}
.range__chip.isActive {
  border-color: #606692;
  color: #2e3567;
  font-weight: 500;
}
.range__date {
  margin-left: auto;
  color: #606692;
}
.customRange {
  position: relative;
}
.customRange__trigger {
  display: flex;
  height: 2rem;
  align-items: center;
  gap: 0.375rem;
  padding: 0 0.625rem;
  border: 1px solid #d2d5dd;
  border-radius: 8px;
  background: white;
  color: #383c4b;
  font: inherit;
  font-size: 0.8125rem;

  &[aria-expanded='true'] {
    border-color: #2e3567;
    color: #2e3567;
  }

  &:focus-visible {
    outline: 2px solid #f2bb00;
    outline-offset: 2px;
  }
}
.customRange__chevron {
  width: 0.75rem;
  height: 0.75rem;
  flex-shrink: 0;
  color: #b4b9c4;
  transition: transform 0.15s;
}
.customRange__trigger[aria-expanded='true'] .customRange__chevron {
  transform: rotate(180deg);
}
@include below($bp-sm) {
  .range {
    flex-wrap: wrap;
    align-items: center;
  }
  .range__date {
    flex: 1 1 auto;
    margin-left: 0;
  }
  .range__export {
    margin-left: auto;
  }
}
.quota,
.card,
.metric {
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 7px rgba(96, 100, 114, 0.2);
}
.quota {
  padding: 1.125rem 1.25rem;
  margin-bottom: 1rem;
}
.quotaAlert {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 1rem;
  padding: 0.75rem 0.875rem;
  border-left: 3px solid #f2bb00;
  border-radius: 8px;
  background: #eff2fa;
  color: #383c4b;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: normal;

  svg {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }
}
.card h2,
.metric h2 {
  font-size: 1rem;
  color: #2e3567;
  font-weight: 700;
}
.quota__row {
  display: grid;
  grid-template-columns: minmax(0, 700fr) minmax(0, 298fr);
  align-items: center;
  gap: 2rem;
}
.quota__usage {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.5rem;
}
.quota__eyebrow {
  color: #b4b9c4;
  font-size: 0.8125rem;
  line-height: normal;
}
.quota__value {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}
.quota__value svg {
  width: 1.5rem;
  height: 1.5rem;
  align-self: center;
  color: #ea903a;
}
.quota__value strong {
  color: #2e3567;
  font-size: 1.875rem;
  font-weight: 700;
  line-height: normal;
}
.quota__value span {
  color: #b4b9c4;
  font-size: 0.9375rem;
  line-height: normal;
}
.quota__value em {
  color: #ea903a;
  font-size: 0.9375rem;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
}
.gauge {
  height: 0.875rem;
  border-radius: 8px;
  background: #eff2fa;
  position: relative;
  overflow: visible;
}
.gauge__used {
  width: 75%;
  height: 100%;
  background: #2e3567;
  border-radius: 8px;
}
.gauge__forecast {
  position: absolute;
  left: 75%;
  top: 0;
  width: 10%;
  height: 100%;
  background: #ea903a88;
}
.gauge__threshold {
  position: absolute;
  left: 80%;
  top: -0.25rem;
  width: 0.125rem;
  height: 1.375rem;
  background: #f2bb00;
}
.gaugeLabels {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  width: 100%;
  font-size: 0.75rem;
  line-height: normal;

  &__current {
    color: #2e3567;
  }
  &__forecast {
    color: #ea903a;
  }
  &__threshold {
    color: #f2bb00;
  }
  &__remaining {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
    color: #b4b9c4;

    svg {
      width: 0.8125rem;
      height: 0.8125rem;
    }
  }
}
.quota__stats {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: flex-start;
  gap: 1.5rem;
}
.quota__kpi {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 0.125rem;
}
.quota__kpi span {
  font-size: 0.75rem;
  color: #b4b9c4;
}
.quota__kpi small {
  color: #b4b9c4;
  font-size: 0.6875rem;
  line-height: normal;
}
.quota__kpi strong {
  color: #383c4b;
  font-size: 1.125rem;
  line-height: normal;
}
.quota__kpi strong.ok {
  color: #45b85b;
}
.quota__kpi strong.warn {
  color: #ea903a;
}
.usageGrid {
  display: grid;
  grid-template-columns: minmax(0, 726fr) minmax(0, 360fr);
  gap: 1rem;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}
.card {
  height: 100%;
  min-width: 0;
  padding: 1.5rem;
}

.trend {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  h2 {
    font-size: 1.125rem;
    line-height: 1.375rem;
  }
}

.trendConclusion {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-left: 3px solid #f2bb00;
  border-radius: 8px;
  background: #eff2fa;
  color: #383c4b;

  strong {
    flex-shrink: 0;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    white-space: nowrap;
  }

  span {
    overflow: hidden;
    color: #606692;
    font-size: 0.8125rem;
    line-height: 1.125rem;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  small {
    flex-shrink: 0;
    margin-left: auto;
    color: #b4b9c4;
    font-size: 0.75rem;
    line-height: 1rem;
    white-space: nowrap;
  }
}

.trendChart {
  position: relative;
  min-height: 11.25rem;
  flex: 1;
  width: 100%;

  &__plot {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  &__grid line {
    stroke: #eff2fa;
  }

  &__limitLine {
    stroke: #ff6148;
    stroke-dasharray: 6 4;
  }

  &__warningLine {
    stroke: #f2bb00;
    stroke-dasharray: 6 4;
  }

  &__todayLine {
    stroke: #d2d5dd;
  }

  &__actual,
  &__forecast {
    fill: none;
    stroke-linejoin: round;
    stroke-width: 2.5;
  }

  &__actual {
    stroke: #2e3567;
  }

  &__forecast {
    stroke: #ea903a;
    stroke-dasharray: 7 5;
  }

  &__todayDot {
    fill: #2e3567;
  }

  &__forecastDot {
    fill: white;
    stroke: #ea903a;
    stroke-width: 2.5;
  }

  &__bars rect {
    fill: #a5c8e6;
  }

  &__label {
    position: absolute;
    z-index: 1;
    color: #b4b9c4;
    font-size: 0.5625rem;
    line-height: 0.75rem;
    white-space: nowrap;

    &--y {
      left: 0;
    }

    &--x {
      bottom: -0.125rem;
      transform: translateX(-50%);
    }

    &--today {
      top: -0.9375rem;
      left: 89.1%;
      color: #606692;
      transform: translateX(-50%);
    }

    &--limit {
      top: 0.25rem;
      right: 0;
      color: #ff6148;
    }

    &--threshold {
      top: 13.55%;
      right: 0;
      color: #c69a00;
    }
  }
}

.trendLegend {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.375rem 1.125rem;
  padding-top: 0.375rem;

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: #606692;
    font-size: 0.75rem;
    line-height: 1rem;

    img {
      width: 0.875rem;
      height: 0.625rem;
      object-fit: contain;
    }
  }
}
.modules {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: hidden;

  h2 {
    color: #383c4b;
    line-height: 1.375rem;
  }
}
.module {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.module__summary,
.module__meta {
  display: flex;
  width: 100%;
  align-items: center;
}
.module__summary {
  justify-content: space-between;

  > strong {
    color: #383c4b;
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.25rem;
  }
}
.module__feed {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.25rem;
  white-space: nowrap;

  &Icon {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
  }

  &--primary {
    color: #2e3567;
  }

  &--muted {
    color: #606692;
  }

  &--orange {
    color: #ea903a;
  }

  &--green {
    color: #54c14f;
  }
}
.module__track {
  width: 100%;
  height: 0.5rem;
  overflow: hidden;
  background: #eff2fa;
  border-radius: 3px;
}
.module__track span {
  display: block;
  height: 0.375rem;
  border-radius: 3px;
  background: #606692;
}
.module__meta {
  gap: 0.5rem;
  color: #383c4b;
  font-size: 0.75rem;
  line-height: normal;
  white-space: nowrap;

  span:first-child {
    font-weight: 500;
  }

  span:last-child {
    margin-left: auto;
    color: #b4b9c4;
  }
}
.module__meta .up {
  color: #ea903a;
}
.module__meta .down {
  color: #45b85b;
}
.modules__note {
  margin-top: auto;
  color: #b4b9c4;
  font-size: 0.75rem;
  line-height: 1rem;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.metric {
  display: flex;
  min-height: 9.125rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 0;
  border-radius: 10px;
  box-shadow: 0 4px 7px rgba(96, 100, 114, 0.2);

  h2 {
    color: #383c4b;
    line-height: 1.375rem;
  }

  p {
    color: #606692;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  &__row {
    display: flex;
    width: 100%;
    height: 2.5rem;
    align-items: baseline;
    gap: 0.5rem;
    overflow: hidden;

    strong {
      color: #2e3567;
      font-size: 2rem;
      font-weight: 700;
      line-height: 2.5rem;
      white-space: nowrap;

      &.green {
        color: #54c14f;
      }

      &.orange {
        color: #ea903a;
      }

      &.muted {
        color: #606692;
      }
    }

    span {
      box-sizing: border-box;
      display: flex;
      height: 1.375rem;
      align-items: center;
      flex-shrink: 0;
      padding: 0.1875rem 0.75rem;
      border: 1px solid #d2d5dd;
      border-radius: 16px;
      background: white;
      color: #606692;
      font-size: 0.8125rem;
      font-weight: 400;
      line-height: 0.875rem;
      white-space: nowrap;
    }
  }

  &__feedIcon {
    width: 1.125rem;
    height: 1.125rem;
    flex-shrink: 0;
  }
}
.trackingNote {
  display: flex;
  min-height: 4.375rem;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 10px;
  background: #eff2fa;
  color: #606692;
  font-size: 0.875rem;
}
.trackingNote svg {
  color: #f2bb00;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}
.trackingNote strong {
  color: #606692;
  line-height: 1.25rem;
}
.trackingNote p {
  margin-top: 0.125rem;
  font-size: 0.75rem;
  line-height: 1rem;
}
@include below($bp-lg) {
  .quota__row {
    grid-template-columns: 1fr;
  }
  .quota__usage {
    width: auto;
  }
  .quota__stats {
    width: 100%;
  }
  .usageGrid {
    grid-template-columns: 1fr;
    flex: none;
  }
  .card {
    height: auto;
  }
  .metrics {
    grid-template-columns: 1fr;
  }
  .metric {
    width: 100%;
  }
}
</style>
