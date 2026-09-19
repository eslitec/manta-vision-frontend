import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadFile } from './download'

// vitest 跑在 node 環境，沒有 document；下載成功那條路（建立 <a download>）改由瀏覽器人工驗證。
describe('downloadFile（download）', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetch 失敗（CORS／斷網）時退回開新分頁', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const open = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', { open })

    await downloadFile('https://r2.example.com/results/a.png')

    expect(fetchMock).toHaveBeenCalledWith('https://r2.example.com/results/a.png', { cache: 'no-store' })
    expect(open).toHaveBeenCalledWith('https://r2.example.com/results/a.png', '_blank', 'noopener')
  })

  it('HTTP 404（暫存過期）時丟錯，不開分頁', async () => {
    const open = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 })))
    vi.stubGlobal('window', { open })

    await expect(downloadFile('https://r2.example.com/results/a.png')).rejects.toThrow('DOWNLOAD_HTTP_404')
    expect(open).not.toHaveBeenCalled()
  })
})
