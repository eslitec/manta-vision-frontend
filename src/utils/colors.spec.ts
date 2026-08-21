import { describe, expect, it } from 'vitest'
import { dominantColorShares, dominantColors } from './colors'

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

  // 「挑哪些色」看評分（飽和度加權），「怎麼排序」看像素占比——兩件事分開測。
  it('飽和度加權：名額有限時，小面積的鮮豔色勝過大面積的淡色背景', () => {
    const dull: [number, number, number, number] = [200, 205, 215, 255] // 大面積淡灰藍
    const vivid: [number, number, number, number] = [220, 20, 30, 255] // 小面積鮮紅
    const data = pixels([
      ...Array<[number, number, number, number]>(20).fill(dull),
      ...Array<[number, number, number, number]>(5).fill(vivid),
    ])
    expect(dominantColors(data, 1)).toEqual(['#DC141E']) // 只留一席時選鮮紅，即使像素較少
  })

  it('回傳順序依像素占比由大到小，與挑選用的評分無關', () => {
    const dull: [number, number, number, number] = [200, 205, 215, 255]
    const vivid: [number, number, number, number] = [220, 20, 30, 255]
    const data = pixels([
      ...Array<[number, number, number, number]>(20).fill(dull),
      ...Array<[number, number, number, number]>(5).fill(vivid),
    ])
    // 兩色都入選，但淡灰藍占 20/25，排在鮮紅之前
    expect(dominantColors(data, 6)).toEqual(['#C8CDD7', '#DC141E'])
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

describe('dominantColorShares', () => {
  it('占比對應像素數，且加總為 1', () => {
    const data = pixels([
      ...Array<[number, number, number, number]>(6).fill([255, 0, 0, 255]),
      ...Array<[number, number, number, number]>(4).fill([0, 0, 255, 255]),
    ])
    const out = dominantColorShares(data, 6)
    expect(out.find((c) => c.hex === '#FF0000')?.share).toBeCloseTo(0.6)
    expect(out.find((c) => c.hex === '#0000FF')?.share).toBeCloseTo(0.4)
    expect(out.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1)
  })

  it('相近色併入代表色，不另外拆成一項，否則占比會失真', () => {
    const data = pixels([
      ...Array<[number, number, number, number]>(5).fill([255, 0, 0, 255]),
      ...Array<[number, number, number, number]>(5).fill([220, 20, 20, 255]), // 與上者距離 45（≤ 48）
    ])
    const out = dominantColorShares(data, 6)
    expect(out).toHaveLength(1)
    expect(out[0].share).toBeCloseTo(1)
  })

  it('dominantColors 與 dominantColorShares 的色碼順序一致', () => {
    const data = pixels([
      ...Array<[number, number, number, number]>(6).fill([255, 0, 0, 255]),
      ...Array<[number, number, number, number]>(4).fill([0, 0, 255, 255]),
    ])
    expect(dominantColors(data, 6)).toEqual(dominantColorShares(data, 6).map((c) => c.hex))
  })
})
