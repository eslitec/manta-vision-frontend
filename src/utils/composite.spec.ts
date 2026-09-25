import { describe, expect, it } from 'vitest'
import { coverRect, layerRectInSource, percentPointInSource, percentRectInSource } from './composite'

const ASPECT = 4 / 3

describe('coverRect', () => {
  it('寬圖：高度吃滿、左右各裁掉一半多出來的寬', () => {
    expect(coverRect({ width: 1600, height: 900 }, ASPECT)).toEqual({ x: 200, y: 0, width: 1200, height: 900 })
  })

  it('高圖：寬度吃滿、上下各裁掉一半多出來的高', () => {
    expect(coverRect({ width: 1000, height: 1000 }, ASPECT)).toEqual({ x: 0, y: 125, width: 1000, height: 750 })
  })

  it('剛好 4:3 時就是整張原圖', () => {
    expect(coverRect({ width: 1024, height: 768 }, ASPECT)).toEqual({ x: 0, y: 0, width: 1024, height: 768 })
  })
})

describe('percentPointInSource / percentRectInSource', () => {
  const cover = { x: 200, y: 0, width: 1200, height: 900 }

  it('百分比中心點換成原圖像素時要加上 cover 的偏移', () => {
    expect(percentPointInSource({ x: 50, y: 50 }, cover)).toEqual({ x: 800, y: 450 })
  })

  it('預設 1:1 裁切框（x 12.5%、寬 75%）落在 cover 區裡的正方形', () => {
    expect(percentRectInSource({ x: 12.5, y: 0, width: 75, height: 100 }, cover)).toEqual({
      x: 350,
      y: 0,
      width: 900,
      height: 900,
    })
  })
})

describe('layerRectInSource', () => {
  it('置中、寬 40%、2:1 的圖層 → 以中心點展開的矩形', () => {
    const cover = { x: 0, y: 0, width: 1000, height: 750 }
    expect(layerRectInSource({ x: 50, y: 50 }, 40, 2, cover)).toEqual({ x: 300, y: 275, width: 400, height: 200 })
  })

  it('cover 有偏移時圖層矩形也跟著平移', () => {
    const cover = { x: 200, y: 0, width: 1200, height: 900 }
    expect(layerRectInSource({ x: 0, y: 0 }, 10, 1, cover)).toEqual({ x: 140, y: -60, width: 120, height: 120 })
  })
})
