export type UsageAlertLevel = 'none' | 'approaching' | 'exceeded'

export function getUsageAlertLevel(percent: number, warningPercent: number, leadPercent = 5): UsageAlertLevel {
  if (percent >= warningPercent) return 'exceeded'
  if (percent >= warningPercent - leadPercent) return 'approaching'
  return 'none'
}
