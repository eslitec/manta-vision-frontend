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
