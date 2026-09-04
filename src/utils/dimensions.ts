// 素材卡片下方那行「1024×768」的共用格式化——真實圖庫（real.ts）與內建素材
// （LibraryView.vue 渲染 Material 卡片時）共用同一支，兩邊的「量不出來」判斷
// 才會是同一個標準：後端寬高皆可為 null（舊資料、Pillow 解不開的檔案），
// 只要有一邊缺，就當作沒有這行 meta——不要顯示「1024×undefined」這種半吊子文字。

export function formatDimensions(width?: number | null, height?: number | null): string {
  if (!width || !height) return ''

  return `${width}×${height}`
}
