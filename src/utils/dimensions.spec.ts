import { describe, expect, it } from 'vitest'
import { formatDimensions } from './dimensions'

describe('formatDimensions', () => {
  it('formats a real pair as "width×height"', () => {
    expect(formatDimensions(1024, 768)).toBe('1024×768')
  })

  it.each([
    [null, null],
    [undefined, undefined],
    [1024, null],
    [null, 768],
    [0, 768], // 0 是不合理的邊長，跟「量不出來」一視同仁，不顯示成 "0×768"
  ] as const)('returns an empty string when width=%s height=%s', (width, height) => {
    expect(formatDimensions(width, height)).toBe('')
  })
})
