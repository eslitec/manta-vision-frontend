// 瀏覽器端把 Blob／File 觸發成「下載到本機」的共用工具。
//
// 圖庫下載素材（LibraryView）、編輯器另存裁切結果／demo 另存（ImageEditorWorkspace）、
// 用量頁匯出 CSV（UsageView）原本各自重複實作同一段邏輯：建立暫時的 object URL、
// 模擬點一下隱藏的 <a download>、下載觸發後立刻清掉——這裡抽成共用函式，
// 也避免各自實作時漏掉 revokeObjectURL，讓 object URL 一直佔著記憶體。
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

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
  downloadBlob(await response.blob(), filename)
}
