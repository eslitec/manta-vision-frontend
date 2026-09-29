import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import type { Asset, AssetSource } from '@/types/asset'
import { isListedInPicker, uploadErrorMessage, type PickerFilter } from './imagePicker'

const asset = (source: AssetSource, name = '新圖.png'): Asset => ({ id: 'a1', name, source, dim: '', type: 'image' })
const filter = (patch: Partial<PickerFilter> = {}): PickerFilter => ({
  mode: 'asset',
  excludeSources: [],
  source: 'all',
  keyword: '',
  ...patch,
})
const t = (key: string) => `t:${key}`

describe('isListedInPicker', () => {
  it('全部＋空搜尋時列出一般上傳', () => {
    expect(isListedInPicker(asset('upload'), filter())).toBe(true)
  })

  it('AI 生成篩選或搜尋字不符會藏住剛上傳的圖（彈窗據此切回全部並清空搜尋）', () => {
    expect(isListedInPicker(asset('upload'), filter({ source: 'aiGenerate' }))).toBe(false)
    expect(isListedInPicker(asset('upload'), filter({ keyword: '海報' }))).toBe(false)
    expect(isListedInPicker(asset('upload'), filter({ source: 'upload', keyword: '新圖' }))).toBe(true)
  })

  it('內建素材只在物件模式列出', () => {
    expect(isListedInPicker(asset('builtin'), filter())).toBe(false)
    expect(isListedInPicker(asset('builtin'), filter({ mode: 'object' }))).toBe(true)
  })

  it('影片素材不列（所有選圖的地方要的都是圖片）', () => {
    expect(isListedInPicker({ ...asset('aiGenerate'), type: 'video' }, filter())).toBe(false)
    expect(isListedInPicker({ ...asset('aiGenerate'), type: 'video' }, filter({ mode: 'object' }))).toBe(false)
    expect(isListedInPicker(asset('aiGenerate'), filter())).toBe(true)
  })

  it('excludeSources 的來源不列（試穿選服飾不列模特照）', () => {
    expect(isListedInPicker(asset('tryonModel'), filter({ excludeSources: ['tryonModel'] }))).toBe(false)
    expect(isListedInPicker(asset('upload'), filter({ excludeSources: ['tryonModel'] }))).toBe(true)
  })
})

describe('uploadErrorMessage', () => {
  it('mock 的 Error(CODE) 對到大小／格式文案', () => {
    expect(uploadErrorMessage(new Error('FILE_TOO_LARGE'), t)).toBe('t:errors.fileTooLarge')
    expect(uploadErrorMessage(new Error('UNSUPPORTED_FORMAT'), t)).toBe('t:errors.unsupportedFormat')
  })

  it('真後端 413／415 的 ApiError 對到同樣的文案，不顯示後端訊息', () => {
    const tooLarge = new ApiError({ code: 'FILE_TOO_LARGE', message: '檔案太大', status: 413 })
    const badFormat = new ApiError({ code: 'UNSUPPORTED_FORMAT', message: '格式錯', status: 415 })
    expect(uploadErrorMessage(tooLarge, t)).toBe('t:errors.fileTooLarge')
    expect(uploadErrorMessage(badFormat, t)).toBe('t:errors.unsupportedFormat')
  })

  it('其他錯誤：真後端用它的訊息，程式例外用通用文案（不把錯誤碼丟到畫面上）', () => {
    const other = new ApiError({ code: 'VALIDATION_ERROR', message: '資料格式錯誤', status: 400 })
    expect(uploadErrorMessage(other, t)).toBe('資料格式錯誤')
    expect(uploadErrorMessage(new Error('boom'), t)).toBe('t:errors.submitFailed')
  })
})
