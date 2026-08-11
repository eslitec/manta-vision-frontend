<template lang="pug">
.usage
  .tabs
    button.tabs__item(v-for="t in tabs" :key="t" :class="{ 'is-active': tab === t }" @click="tab = t") {{ t }}

  template(v-if="tab === '用量統計'")
    p.usage__note 透過任一機器人進入，數字為 Account 全公司加總；剩餘額為共用錢包。
    template(v-if="usage")
      .stats
        .stat
          .stat__num {{ usage.used.toLocaleString() }} #[small 顆飼料]
          .stat__label 本月已消耗
        .stat
          .stat__num.is-ok {{ usage.remaining.toLocaleString() }} #[small 顆飼料]
          .stat__label 剩餘飼料
        .stat
          .stat__num {{ usage.monthlyLimit.toLocaleString() }} #[small 顆飼料]
          .stat__label 本月上限
        .stat
          .stat__num.is-warn {{ usage.percent }}%
          .stat__label 用量（已達告警前）
      p.warn(v-if="usage.percent >= 75")
        i.ti.ti-alert-triangle
        span 用量已達 {{ usage.percent }}%，接近本月上限 80% 告警門檻。可於右下調整額度上限。
      .panels
        section.panel.trend
          h3.panel__title 每日消耗趨勢
          .bars
            .bars__col(v-for="(h, i) in usage.daily" :key="i")
              .bars__bar(:style="{ height: h + '%' }")
        section.panel.modules
          h3.panel__title 依模組消耗
          .mod(v-for="m in usage.byModule" :key="m.label")
            .mod__row
              span.mod__label {{ m.label }}
              span.mod__val(:style="{ color: m.color }") {{ m.value.toLocaleString() }} 顆飼料
            .mod__track
              .mod__fill(:style="{ width: (m.value / maxModule * 100) + '%', background: m.color }")
      .usage__foot
        GhostButton 調整額度上限

  template(v-else)
    p.usage__note 採用率、平均重生成、每採用成本只算圖生圖（其他模組無採用概念）；生成成功率為全模組。
    .metrics(v-if="metrics")
      .metric
        .metric__label 生成成功率
        .metric__value.is-ok {{ metrics.successRate }}%
        .metric__hint 無錯誤完成生成的比例
      .metric
        .metric__label 採用率（圖生圖）
        .metric__value {{ metrics.adoptionRate }}%
        .metric__hint 被下載或存入圖庫的比例
      .metric
        .metric__label 平均重生成次數
        .metric__value {{ metrics.avgRegen }} 次
        .metric__hint 採用前同 session 內的重試次數
      .metric
        .metric__label 每採用素材成本
        .metric__value {{ metrics.costPerAdopted }} 顆
        .metric__hint 期間飼料消耗 ÷ 採用數
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api'
import GhostButton from '@/components/GhostButton.vue'
import type { Metrics, UsageSummary } from '@/types/api'

const tabs = ['用量統計', 'AI 表現指標']
const tab = ref('用量統計')
const usage = ref<UsageSummary | null>(null)
const metrics = ref<Metrics | null>(null)

const maxModule = computed(() => Math.max(1, ...(usage.value?.byModule.map((m) => m.value) ?? [1])))

onMounted(async () => {
  usage.value = await api.getUsage()
  metrics.value = await api.getMetrics()
})
</script>

<style scoped lang="scss">
.tabs { @include flex(flex-start, center, 8px); margin-bottom: 18px; }
.tabs__item { padding: 7px 16px; border-radius: 999px; font-size: 14px; color: $gray-400; background: $white; border: 1px solid $gray;
  &.is-active { background: $blue-dark-300; color: $white; border-color: $blue-dark-300; } }
.usage__note { font-size: 13px; color: $gray-400; margin-bottom: 16px; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px;
  @include below($bp-lg) { grid-template-columns: repeat(2, 1fr); }
  @include below($bp-sm) { grid-template-columns: 1fr; } }
.stat { @include card; padding: 18px 20px;
  &__num { font-size: 24px; font-weight: 800; color: $blue-dark-300; small { font-size: 13px; font-weight: 500; color: $gray-400; margin-left: 4px; }
    &.is-ok { color: $green; } &.is-warn { color: $orange; } }
  &__label { font-size: 13px; color: $gray-400; margin-top: 4px; } }
.warn { @include flex(flex-start, center, 8px); background: #FAEEDA; color: #854F0B; border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
.panels { display: grid; grid-template-columns: 1fr 320px; gap: 16px;
  @include below($bp-lg) { grid-template-columns: 1fr; } }
.panel { @include card; padding: 20px; }
.panel__title { font-size: 15px; font-weight: 700; color: $blue-dark-300; margin-bottom: 16px; }
.bars { @include flex(space-between, flex-end, 6px); height: 200px; }
.bars__col { flex: 1; height: 100%; @include flex(center, flex-end); }
.bars__bar { width: 100%; max-width: 22px; background: $babyBlue; border-radius: 4px 4px 0 0; }
.mod { margin-bottom: 16px;
  &__row { @include flex(space-between, center); margin-bottom: 6px; }
  &__label { font-size: 14px; color: $blue-dark-300; } &__val { font-size: 14px; font-weight: 700; }
  &__track { height: 8px; background: $lightGray; border-radius: 999px; overflow: hidden; } &__fill { height: 100%; border-radius: 999px; } }
.usage__foot { @include flex(flex-end, center); margin-top: 16px; }
.metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
  @include below($bp-sm) { grid-template-columns: 1fr; } }
.metric { @include card; padding: 20px 22px;
  &__label { font-size: 14px; color: $gray-400; }
  &__value { font-size: 30px; font-weight: 800; color: $blue-dark-300; margin: 6px 0; &.is-ok { color: $green; } }
  &__hint { font-size: 12px; color: $gray-100; margin-top: 8px; } }
</style>
