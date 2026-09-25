// 編輯畫布 → 原圖像素的座標換算（純函式，給「另存為新素材」的合成與畫面上的尺寸顯示共用）。
//
// 畫布用 object-fit: cover 把原圖塞進固定比例（4:3）的框，所以畫布上所有百分比（裁切框、
// 圖層中心點、圖層寬度）都是相對「原圖被 cover 裁掉後、實際顯示的那塊」，不是相對整張原圖。
// 先算出那塊顯示區在原圖像素座標裡的位置（coverRect），再把百分比換進去。

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}
export interface Size {
  width: number
  height: number
}

/** 原圖以 object-fit: cover 塞進 aspect（寬／高）比例的畫布時，實際顯示的那塊在原圖像素座標裡的矩形。 */
export function coverRect(natural: Size, aspect: number): Rect {
  if (natural.width / natural.height > aspect) {
    const width = natural.height * aspect
    return { x: (natural.width - width) / 2, y: 0, width, height: natural.height }
  }
  const height = natural.width / aspect
  return { x: 0, y: (natural.height - height) / 2, width: natural.width, height }
}

/** 畫布百分比的點（0–100，相對 cover 顯示區）→ 原圖像素座標。 */
export function percentPointInSource(point: { x: number; y: number }, cover: Rect) {
  return { x: cover.x + (point.x / 100) * cover.width, y: cover.y + (point.y / 100) * cover.height }
}

/** 畫布百分比矩形（x/y/width/height 皆 0–100）→ 原圖像素矩形。 */
export function percentRectInSource(percent: Rect, cover: Rect): Rect {
  const { x, y } = percentPointInSource(percent, cover)
  return { x, y, width: (percent.width / 100) * cover.width, height: (percent.height / 100) * cover.height }
}

/**
 * 以畫布百分比定位的圖層（x/y 為中心點，寬度為畫布寬的 widthPercent%，等比縮放）→ 原圖像素矩形。
 * aspect 為圖層本身的寬／高比（圖片用 naturalWidth / naturalHeight）。
 */
export function layerRectInSource(
  layer: { x: number; y: number },
  widthPercent: number,
  aspect: number,
  cover: Rect,
): Rect {
  const center = percentPointInSource(layer, cover)
  const width = (widthPercent / 100) * cover.width
  const height = width / aspect
  return { x: center.x - width / 2, y: center.y - height / 2, width, height }
}
