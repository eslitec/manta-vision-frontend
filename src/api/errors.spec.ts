import { describe, expect, it } from 'vitest'
import { API_ERROR_CODES, ApiError, hasErrorCode } from './errors'
import { isInsufficientFeed } from '@/utils/error'

describe('hasErrorCode（全專案唯一的錯誤碼判斷）', () => {
  it.each([API_ERROR_CODES.ALREADY_SAVED, API_ERROR_CODES.CONSENT_REQUIRED])(
    '假後端形狀 Error(%s) 判得到（圖生圖／試穿頁靠它分流）',
    (code) => {
      expect(hasErrorCode(new Error(code), code)).toBe(true)
    },
  )

  it('真後端 ApiError 比 code，不比給人看的 message', () => {
    const e = new ApiError({ code: API_ERROR_CODES.ALREADY_SAVED, message: '這張已經存過了', status: 409 })
    expect(hasErrorCode(e, API_ERROR_CODES.ALREADY_SAVED)).toBe(true)
    // message 剛好等於某個碼也不算：ApiError 只認 code
    const tricky = new ApiError({ code: API_ERROR_CODES.NOT_FOUND, message: API_ERROR_CODES.ALREADY_SAVED })
    expect(hasErrorCode(tricky, API_ERROR_CODES.ALREADY_SAVED)).toBe(false)
  })

  it('碼不同、或根本不是 Error 時一律 false', () => {
    expect(hasErrorCode(new Error('NOT_FOUND'), API_ERROR_CODES.ALREADY_SAVED)).toBe(false)
    expect(hasErrorCode(API_ERROR_CODES.ALREADY_SAVED, API_ERROR_CODES.ALREADY_SAVED)).toBe(false)
    expect(hasErrorCode(undefined, API_ERROR_CODES.ALREADY_SAVED)).toBe(false)
  })

  it('純前端碼（不在碼表裡）也能判', () => {
    expect(hasErrorCode(new Error('CROP_NO_SOURCE_IMAGE'), 'CROP_NO_SOURCE_IMAGE')).toBe(true)
  })

  it('utils/error 的具名捷徑走同一份判斷，兩種形狀都認', () => {
    expect(isInsufficientFeed(new Error('INSUFFICIENT_FEEDS'))).toBe(true)
    expect(isInsufficientFeed(new ApiError({ code: 'INSUFFICIENT_FEEDS', message: '飼料不足', status: 402 }))).toBe(
      true,
    )
  })
})
