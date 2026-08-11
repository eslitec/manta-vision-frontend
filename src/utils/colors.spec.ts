import { describe, expect, it } from 'vitest'
import { dominantColors } from './colors'

// 用合成像素（RGBA）測純函式，不需要 DOM／Canvas。
function pixels(colors: [number, number, number, number][]): number[] {
  return colors.flat()
}

describe('dominantColors', () => {
  it('抽出出現最多的顏色', () => {
    const data = pixels([
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [255, 0, 0, 255], // 紅 ×3
      [0, 0, 255, 255], // 藍 ×1
    ])
    const out = dominantColors(data, 6)
    expect(out[0]).toBe('#FF0000') // 最多的排第一
    expect(out).toContain('#0000FF')
  })

  it('略過透明像素', () => {
    const data = pixels([
      [10, 200, 90, 0], // 全透明 → 忽略
      [10, 200, 90, 0],
      [30, 30, 30, 255], // 深灰 ×1
    ])
    const out = dominantColors(data)
    expect(out).toHaveLength(1)
    expect(out[0]).toBe('#1E1E1E')
  })

  it('略過近白背景', () => {
    const data = pixels([
      [255, 255, 255, 255], // 白背景 → 忽略
      [250, 250, 250, 255],
      [0, 128, 64, 255], // 綠
    ])
    const out = dominantColors(data)
    expect(out).toContain('#008040')
    expect(out).not.toContain('#FFFFFF')
  })

  it('飽和度加權：小面積的鮮豔色勝過大面積的淡色背景', () => {
    const dull: [number, number, number, number] = [200, 205, 215, 255] // 大面積淡灰藍
    const vivid: [number, number, number, number] = [220, 20, 30, 255] // 小面積鮮紅
    const data = pixels([
      ...Array<[number, number, number, number]>(20).fill(dull),
      ...Array<[number, number, number, number]>(5).fill(vivid),
    ])
    const out = dominantColors(data)
    expect(out[0]).toBe('#DC141E') // 鮮紅排第一，即使像素較少
  })

  it('限制回傳數量', () => {
    const data = pixels([
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [255, 255, 0, 255],
    ])
    expect(dominantColors(data, 2)).toHaveLength(2)
  })
})
