import { describe, expect, it } from 'vitest'
import type { GeneratedPost } from '@/types/api'
import { mergePost, parseSeed, toBackendStrength } from './generation'

describe('toBackendStrength', () => {
  it('畫面越貼近參考圖（高），送出的 strength 越低', () => {
    expect(toBackendStrength(0.8)).toBe(0.2)
    expect(toBackendStrength(0)).toBe(1)
    expect(toBackendStrength(1)).toBe(0)
  })
})

describe('parseSeed', () => {
  it('空白＝隨機，0 照送', () => {
    expect(parseSeed('')).toBeUndefined()
    expect(parseSeed(0)).toBe(0)
    expect(parseSeed('123')).toBe(123)
  })

  it('負數與小數回 null（由畫面擋下，不送出）', () => {
    expect(parseSeed(-1)).toBeNull()
    expect(parseSeed(1.5)).toBeNull()
  })
})

describe('mergePost', () => {
  const prev: GeneratedPost = {
    poster: { id: 'r_1', generationId: 'gen_1', url: 'a.png', adopted: true },
    copy: '舊文案',
    hashtags: ['#舊'],
  }
  const next: GeneratedPost = {
    poster: { id: 'r_2', generationId: 'gen_2', url: 'b.png', adopted: false },
    copy: '新文案',
    hashtags: ['#新'],
  }

  it('換一張圖：只換配圖，文案保留', () => {
    expect(mergePost(prev, { hashtags: [], poster: next.poster }, 'imageOnly')).toEqual({
      ...prev,
      poster: next.poster,
    })
  })

  it('重寫文案：只換文案與 hashtag，配圖保留', () => {
    expect(mergePost(prev, { copy: '新文案', hashtags: ['#新'] }, 'textOnly')).toEqual({
      ...prev,
      copy: '新文案',
      hashtags: ['#新'],
    })
  })

  it('第一次產生或沒指定 only：整包換掉', () => {
    expect(mergePost(null, next, 'imageOnly')).toBe(next)
    expect(mergePost(prev, next)).toBe(next)
  })
})
