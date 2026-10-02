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
        :max-range-days="MAX_RANGE_DAYS"
        @apply="onApplyCustomRange"
        @cancel="customPanelOpen = false"
      )
    span.range__date {{ dateLabel }}
    AppButton.range__export(v-if="tab === 'usage'" variant="outline" :disabled="!usage" @click="exportUsage") {{ t('usage.export') }}
  p.usage__error(v-if="error" role="alert") {{ error }}

  template(v-if="tab === 'usage'")
    section.quota(:aria-busy="updating || undefined")
      .quota__row
        .quota__usage
          span.quota__eyebrow {{ t('usage.quota.title') }}
          .quota__value
            button.usageFeedBtn(type="button" :aria-label="t('feedBadge.topup')" @click="topUpOpen = true")
              IconFeedBottleSmall
            strong {{ formatNumber(monthUsed) }}
            span(v-if="monthlyLimit !== null") / {{ t('usage.quota.limitOf', { limit: formatNumber(monthlyLimit) }) }}
            span(v-else) {{ t('units.feedShort') }} · {{ t('usage.quota.noLimit') }}
            em(v-if="monthlyLimit !== null") · {{ monthPercent }}%
          template(v-if="monthlyLimit !== null")
            .gauge
              .gauge__used(:style="{ width: `${Math.min(monthPercent, 100)}%` }")
              .gauge__threshold(:style="{ left: `${WARNING_PERCENT}%` }")
            .gaugeLabels
              span.gaugeLabels__current ● {{ t('usage.quota.currentPercent', { percent: monthPercent }) }}
              span.gaugeLabels__threshold | {{ t('usage.quota.thresholdPercent', { percent: WARNING_PERCENT }) }}
              span.gaugeLabels__remaining #[button.usageFeedBtn(type="button" :aria-label="t('feedBadge.topup')" @click="topUpOpen = true") #[IconFeedBottleSmall]] {{ t('usage.quota.remainingValue', { count: formatNumber(Math.max(0, monthlyLimit - monthUsed)) }) }}
          span.quota__balance {{ t('usage.quota.balance', { count: formatNumber(balance) }) }}
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
          strong {{ t('usage.trend.totalLead', { count: formatNumber(usage?.totalUsed ?? 0) }) }}
          span {{ t('usage.trend.avgDetail', { count: formatNumber(usage?.dailyAvg ?? 0) }) }}
          small {{ t('usage.comparedPrevious', { delta: pctDelta(usage?.vsLastMonthPct) }) }}
        .trendChart
          svg.trendChart__plot(viewBox="0 0 678 372" preserveAspectRatio="none" role="img" :aria-label="t('usage.trend.chartLabel', { range: dateLabel })")
            g.trendChart__grid
              line(v-for="y in [0, 58, 116, 174, 232]" :key="y" x1="46" :y1="y" x2="666" :y2="y")
            template(v-if="limitY !== null")
              line.trendChart__limitLine(x1="46" :y1="limitY" x2="666" :y2="limitY")
              line.trendChart__warningLine(x1="46" :y1="warningY" x2="666" :y2="warningY")
            path.trendChart__actual(:d="actualPath")
            circle.trendChart__todayDot(v-if="lastPoint" :cx="lastPoint.x" :cy="lastPoint.y" r="4.5")
            g.trendChart__bars
              rect(v-for="bar in chartBars" :key="bar.x" :x="bar.x" :y="bar.y" :width="bar.width" :height="bar.height" rx="2")
          span.trendChart__label.trendChart__label--y(v-for="tick in yTicks" :key="tick.value" :style="{ top: tick.top }") {{ tick.value }}
          span.trendChart__label.trendChart__label--x(v-for="tick in xTicks" :key="tick.value" :style="{ left: tick.left }") {{ tick.value }}
          span.trendChart__label.trendChart__label--today(v-if="periodTo") {{ t('usage.trend.latestDate', { date: formatDate(periodTo) }) }}
          template(v-if="limitY !== null")
            span.trendChart__label.trendChart__label--limit(:style="{ top: `${(limitY / 372) * 100}%` }") {{ t('usage.trend.limitShort', { limit: formatNumber(monthlyLimit ?? 0) }) }}
            span.trendChart__label.trendChart__label--threshold(:style="{ top: `${(warningY / 372) * 100}%` }") {{ t('usage.trend.thresholdShort') }}
        .trendLegend
          span.trendLegend__item(v-for="item in legendItems" :key="item.key")
            img(:src="item.icon" alt="")
            | {{ t(`usage.legend.${item.key}`) }}
      section.card.modules
        h2 {{ t('usage.modules.title') }}
        .module(v-for="m in moduleCards" :key="m.type")
          .module__summary
            strong {{ m.name }}
            b.module__feed(:style="{ color: m.color }")
              button.usageFeedBtn(type="button" :aria-label="t('feedBadge.topup')" @click="topUpOpen = true")
                IconFeedBottleSmall.module__feedIcon
              | {{ t('units.feed', { count: m.used }) }}
          .module__meta #[span {{ t('usage.modules.share', { share: m.sharePct }) }}] #[span(:class="deltaTone(m.vsLastMonthPct)") {{ t('usage.comparedPrevious', { delta: pctDelta(m.vsLastMonthPct) }) }}] #[span {{ t('usage.modules.average', { average: m.avgPerGen }) }}]
          .module__track: span(:style="{ width: m.sharePct + '%' }")

  template(v-else)
    .metrics(:aria-busy="updating || undefined")
      article.metric(v-for="m in metricCards" :key="m.label")
        h2 {{ m.label }}
        .metric__row
          button.usageFeedBtn(v-if="m.feed" type="button" :aria-label="t('feedBadge.topup')" @click="topUpOpen = true")
            IconFeedBottleSmall.metric__feedIcon
          strong(:class="m.tone")
            | {{ m.value }}
          span {{ m.delta }}
        p {{ m.hint }}
  TopUpDialog(v-model:open="topUpOpen")
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { api } from '@/api'
import AppButton from '@/components/AppButton.vue'
import DateRangeCalendarPanel from '@/components/DateRangeCalendarPanel.vue'
import TopUpDialog from '@/components/TopUpDialog.vue'
import { IconAlertTriangleFilled, IconChevronDown, IconFeedBottleSmall } from '@/components/icons'
import { useDismissableMenu } from '@/composables/useDismissableMenu'
import { useFeedStore } from '@/stores/feed'
import type { Metrics, PeriodParams, UsageModule, UsageSummary } from '@/types/api'
import { displayMessage } from '@/utils/error'
import { getUsageAlertLevel } from '@/utils/usage'
import { downloadBlob } from '@/utils/download'
import legendActualUrl from '@/assets/images/usage-legend-actual.svg'
import legendDailyUrl from '@/assets/images/usage-legend-daily.svg'
import legendWarningUrl from '@/assets/images/usage-legend-warning.svg'
import legendLimitUrl from '@/assets/images/usage-legend-limit.svg'

// 口徑（design.md 決策 4～6）：
// - 「本月已用／上限」與告警線讀 GET /feeds（台北日曆月），與所選期間無關
// - 趨勢、日均、較前期、模組卡讀 GET /feeds/usage；指標讀 GET /metrics；兩者共用同一組期間 chip
// - 任何 null（分母 0、前期 0）一律顯示「—」，不當成 0
const WARNING_PERCENT = 80
const MAX_RANGE_DAYS = 366 // 同後端 period.py 的跨度上限（含頭含尾）
const MODULE_COLORS = ['#2e3567', '#606692', '#ea903a', '#54c14f', '#7f77dd']
const PERIOD_OF: Record<string, PeriodParams['period']> = {
  month: 'month',
  days30: '30d',
  days90: '90d',
  custom: 'custom',
}
const NONE = '—'

const { t, te } = useI18n()
const feed = useFeedStore()
const { balance, monthlyLimit, monthUsed } = storeToRefs(feed)
const tabs = computed(() => ['usage', 'metrics'].map((value) => ({ value, label: t(`usage.tabs.${value}`) })))
const tab = ref('usage')
const topUpOpen = ref(false)
const ranges = computed(() =>
  ['month', 'days30', 'days90', 'custom'].map((value) => ({ value, label: t(`usage.ranges.${value}`) })),
)
const range = ref('month')

function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
// 自訂區間預設「今天往前 30 天」到今天（本地日期）
const today = new Date()
const customStart = ref(isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)))
const customEnd = ref(isoDate(today))
const appliedCustomStart = ref(customStart.value)
const appliedCustomEnd = ref(customEnd.value)
const customPanelOpen = ref(false)
const customRangeRef = ref<HTMLElement | null>(null)
const customRangeTriggerLabel = computed(
  () => `${customStart.value.replaceAll('-', '/')} – ${customEnd.value.replaceAll('-', '/')}`,
)
useDismissableMenu(customPanelOpen, customRangeRef)

const usage = ref<UsageSummary | null>(null) // groupBy=day 那一份（頂層四欄也取它）
const modules = ref<UsageModule[]>([])
const metrics = ref<Metrics | null>(null)
const updating = ref(false)
const error = ref('')
let loadSeq = 0

const periodParams = computed<PeriodParams>(() =>
  range.value === 'custom'
    ? { period: 'custom', startDate: appliedCustomStart.value, endDate: appliedCustomEnd.value }
    : { period: PERIOD_OF[range.value] },
)

// 趨勢與模組卡各打一次 GET /feeds/usage（平行）；用遞增序號擋掉切換太快時的過期回應
async function load() {
  const seq = ++loadSeq
  updating.value = true
  error.value = ''
  try {
    const params = periodParams.value
    if (tab.value === 'usage') {
      const [day, byModule] = await Promise.all([
        api.getUsage({ ...params, groupBy: 'day' }),
        api.getUsage({ ...params, groupBy: 'module' }),
      ])
      if (seq !== loadSeq) return
      usage.value = day
      modules.value = byModule.byModule ?? []
    } else {
      const result = await api.getMetrics(params)
      if (seq !== loadSeq) return
      metrics.value = result
    }
  } catch (e) {
    if (seq === loadSeq) error.value = displayMessage(e, t('errors.loadFailed'))
  } finally {
    if (seq === loadSeq) updating.value = false
  }
}
watch(tab, (value) => {
  range.value = value === 'metrics' ? 'days30' : 'month'
})
watch([tab, periodParams], load, { immediate: true })
onMounted(() => {
  // 同首頁：頂欄已載過就沿用 store（生成流程結束時各頁會自己 refresh）
  if (!feed.loaded) feed.refresh().catch((e) => (error.value = displayMessage(e, t('errors.loadFailed'))))
})

function selectRange(value: string) {
  range.value = value
  // 自訂區間：切到這個 chip（或再次點擊）就打開 panel_calendar 下拉面板，
  // 面板自己的「套用」才會真的套用新區間並重新請求
  customPanelOpen.value = value === 'custom'
}
function onApplyCustomRange(start: string, end: string) {
  customStart.value = start
  customEnd.value = end
  appliedCustomStart.value = start
  appliedCustomEnd.value = end
  customPanelOpen.value = false
}

function formatDate(date: string) {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${Number(day)}`
}
function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}
function pctDelta(value: number | null | undefined) {
  return value == null ? NONE : `${value > 0 ? '+' : ''}${value}%`
}
function deltaTone(value: number | null) {
  return value == null ? '' : value < 0 ? 'down' : 'up'
}
// 絕對差帶正負號、一位小數；負號用 U+2212
function signed(value: number) {
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}`
}

const activePeriod = computed(() => (tab.value === 'usage' ? usage.value?.period : metrics.value?.period))
const periodTo = computed(() => activePeriod.value?.to ?? '')
const dateLabel = computed(() => {
  const period = activePeriod.value
  return period ? `${period.from.replaceAll('-', '/')} – ${period.to.replaceAll('-', '/')}` : ''
})

const monthPercent = computed(() => (monthlyLimit.value ? Math.round((monthUsed.value / monthlyLimit.value) * 100) : 0))
const usageAlert = computed(() => {
  if (monthlyLimit.value === null) return ''
  const level = getUsageAlertLevel(monthPercent.value, WARNING_PERCENT)
  if (level === 'none') return ''
  return t(`usage.quota.${level === 'exceeded' ? 'alertExceeded' : 'alertApproaching'}`, {
    percent: monthPercent.value,
    threshold: WARNING_PERCENT,
  })
})
const quotaKpis = computed(() => {
  const avg = usage.value?.dailyAvg ?? 0
  const limit = monthlyLimit.value
  // 預計用罄＝(上限 − 本月已用) ÷ 選取期間日均；無上限或日均 0 顯示「—」
  const daysLeft = limit !== null && avg > 0 ? Math.ceil((limit - monthUsed.value) / avg) : null
  const vsPrev = usage.value?.vsLastMonthPct
  return [
    {
      label: t('usage.kpis.daily.label'),
      value: formatNumber(avg),
      hint: t('usage.kpis.daily.dynamicHint', { count: formatNumber(avg) }),
      tone: '',
    },
    {
      label: t('usage.kpis.depletion.label'),
      value:
        daysLeft === null
          ? NONE
          : daysLeft > 0
            ? t('usage.kpis.depletion.days', { days: daysLeft })
            : t('usage.kpis.depletion.exhausted'),
      hint: t('usage.kpis.depletion.hint'),
      tone: daysLeft === null ? '' : daysLeft > 0 ? 'ok' : 'warn',
    },
    {
      label: t('usage.kpis.previous.label'),
      value: pctDelta(vsPrev),
      hint: t('usage.kpis.previous.hint'),
      tone: (vsPrev ?? 0) > 0 ? 'warn' : '',
    },
  ]
})

// ── 趨勢圖：實際累積折線＋每日長條；上限線與告警線只在有月上限時畫 ──
const daily = computed(() => usage.value?.daily?.map((d) => d.used) ?? [])
const cumulative = computed(() => {
  let sum = 0
  return daily.value.map((value) => (sum += value))
})
const yMax = computed(() => Math.max(monthlyLimit.value ?? 0, cumulative.value.at(-1) ?? 0, 1))
function pointAt(index: number, value: number) {
  const x = 46 + (620 * index) / Math.max(cumulative.value.length - 1, 1)
  const y = 232 - (value / yMax.value) * 232
  return { x, y }
}
const actualPoints = computed(() => cumulative.value.map((value, index) => pointAt(index, value)))
const actualPath = computed(() =>
  actualPoints.value.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '),
)
const lastPoint = computed(() => actualPoints.value.at(-1) ?? null)
const limitY = computed(() => (monthlyLimit.value === null ? null : 232 - (monthlyLimit.value / yMax.value) * 232))
const warningY = computed(() =>
  monthlyLimit.value === null ? 0 : 232 - ((monthlyLimit.value * WARNING_PERCENT) / 100 / yMax.value) * 232,
)
const chartBars = computed(() => {
  const values = daily.value
  if (!values.length) return []
  const max = Math.max(...values, 1)
  const width = Math.max(2, Math.min(12, 570 / values.length))
  return values.map((value, index) => {
    const height = 80 * (value / max)
    return { x: 46 + (620 * index) / Math.max(values.length - 1, 1) - width / 2, y: 354 - height, width, height }
  })
})
const yTicks = computed(() =>
  [1, 0.75, 0.5, 0.25, 0].map((ratio, index) => ({
    value: formatNumber(Math.round(yMax.value * ratio)),
    top: index === 0 ? '-0.4375rem' : `${((index * 58) / 372) * 100}%`,
  })),
)
const xTicks = computed(() => {
  const period = usage.value?.period
  if (!period) return []
  const start = Date.parse(period.from)
  const end = Date.parse(period.to)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start + ((end - start) * index) / 6)
    return { value: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`, left: `${5.53 + index * 15.17}%` }
  })
})
const legendItems = computed(() =>
  [
    { key: 'actual', icon: legendActualUrl },
    { key: 'daily', icon: legendDailyUrl },
    { key: 'warning', icon: legendWarningUrl },
    { key: 'limit', icon: legendLimitUrl },
  ].filter((item) => limitY.value !== null || (item.key !== 'warning' && item.key !== 'limit')),
)

// ── 模組卡：照後端清單渲染，名稱走 i18n 對照、對不到顯示 type，顏色依固定色盤循環 ──
const moduleCards = computed(() =>
  modules.value.map((m, index) => ({
    ...m,
    name: te(`usage.modules.items.${m.type}`) ? t(`usage.modules.items.${m.type}`) : m.type,
    color: MODULE_COLORS[index % MODULE_COLORS.length],
  })),
)

function exportUsage() {
  const data = usage.value
  if (!data) return
  const rows: (string | number)[][] = [
    [t('usage.exportFields.period'), dateLabel.value],
    [t('usage.exportFields.used'), data.totalUsed],
    [t('usage.exportFields.dailyAvg'), data.dailyAvg],
    [],
    [t('usage.exportFields.date'), t('usage.exportFields.feed')],
    ...(data.daily ?? []).map((d) => [d.date, d.used]),
    [],
    [t('usage.exportFields.module'), t('usage.exportFields.feed'), t('usage.exportFields.share')],
    ...moduleCards.value.map((m) => [m.name, m.used, `${m.sharePct}%`]),
  ]
  const csv = `﻿${rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')}`
  downloadBlob(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    `manta-vision-usage-${data.period.from}-${data.period.to}.csv`,
  )
}

// ── 指標卡：值與較前期各自判 null；較前期是絕對差，文案依欄位單位 ──
const metricCards = computed(() => {
  const m = metrics.value
  const d = m?.vsLastPeriod
  const pct = (value: number | null | undefined) => (value == null ? NONE : `${value.toFixed(1)}%`)
  const delta = (value: number | null | undefined, unit: 'pct' | 'times' | 'feeds') =>
    value == null ? NONE : t(`usage.metrics.vsLastPeriod.${unit}`, { delta: signed(value) })
  return [
    { value: pct(m?.successRate), delta: delta(d?.successRate, 'pct'), tone: 'green', feed: false },
    { value: pct(m?.adoptionRate), delta: delta(d?.adoptionRate, 'pct'), tone: '', feed: false },
    {
      value: m?.avgRegenerate == null ? NONE : t('usage.metrics.times', { value: m.avgRegenerate.toFixed(1) }),
      delta: delta(d?.avgRegenerate, 'times'),
      tone: 'orange',
      feed: false,
    },
    {
      value: m?.costPerAdopted == null ? NONE : m.costPerAdopted.toFixed(1),
      delta: delta(d?.costPerAdopted, 'feeds'),
      tone: 'muted',
      feed: true,
    },
  ].map((card, index) => ({
    ...card,
    label: t(`usage.metrics.items.${index}.label`),
    hint: t(`usage.metrics.items.${index}.hint`),
  }))
})
</script>

<style scoped lang="scss">
.usageFeedBtn {
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
.usage__error {
  margin-bottom: 1rem;
  color: #ff6148;
  font-size: 0.875rem;
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
.quota__balance {
  color: #606692;
  font-size: 0.8125rem;
  line-height: normal;
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

  &__actual {
    fill: none;
    stroke: #2e3567;
    stroke-linejoin: round;
    stroke-width: 2.5;
  }

  &__todayDot {
    fill: #2e3567;
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

    // 上限／告警標籤跟著線的 y 位置（inline top），貼在線的上方
    &--limit,
    &--threshold {
      right: 0;
      transform: translateY(-100%);
    }

    &--limit {
      color: #ff6148;
    }

    &--threshold {
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
