// 跨網域的 <a download> 會被瀏覽器忽略，所以先讀成 Blob、轉成同源的 blob: 網址再觸發下載。
// fetch 本身失敗（R2 沒開 CORS、斷網）時退回開新分頁；HTTP 非 2xx（暫存過期 404）要丟錯，
// 不能把錯誤頁當成檔案存下來。
// cache: 'no-store'：R2 對不帶 Origin 的請求不回 Vary: Origin，<img> 先載過的那份快取沒有 CORS 標頭，
// 被 fetch 重用的話 CORS 會失敗而退化成開新分頁，所以直接跳過快取重抓一次。
export async function downloadFile(
  url: string,
  filename = url.split('?')[0].split('/').pop() || 'download',
): Promise<void> {
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store' })
  } catch {
    window.open(url, '_blank', 'noopener')
    return
  }
  if (!response.ok) throw new Error(`DOWNLOAD_HTTP_${response.status}`)
  const blobUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}
