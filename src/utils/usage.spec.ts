import { describe, expect, it } from 'vitest'
import { getUsageAlertLevel } from './usage'

describe('getUsageAlertLevel', () => {
  it.each([
    [74, 'none'],
    [75, 'approaching'],
    [79, 'approaching'],
    [80, 'exceeded'],
    [105, 'exceeded'],
  ] as const)('returns the correct state at %i%% usage', (percent, expected) => {
    expect(getUsageAlertLevel(percent, 80)).toBe(expected)
  })
})
