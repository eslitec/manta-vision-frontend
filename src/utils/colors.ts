// 從圖片抽取「品牌重點色」（純前端，Canvas 取樣＋飽和度加權）。
// 分成「純函式」與「DOM 部分」，純函式可在 node 環境單元測試。
//
// 做法參考 Android Palette／Vibrant：不只看顏色面積，還把顏色的「飽和度、明度」
// 納入評分，讓鮮豔的重點色勝過大面積的淡色背景——這對抓品牌識別色更貼切。

interface RGB {
  r: number
  g: number
  b: number
}

function toHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function dist(a: RGB, b: RGB): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

// 回傳飽和度 s 與明度 l（皆 0..1）
function satLight({ r, g, b }: RGB): { s: number; l: number } {
  const rr = r / 255
  const gg = g / 255
  const bb = b / 255
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const l = (max + min) / 2
  if (max === min) return { s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  return { s, l }
}

/**
 * 純函式：吃 RGBA 像素陣列，回傳前 N 個「品牌重點色」（hex）。
 * 略過透明像素與近白背景；量化到 8³ 桶；評分＝面積(開根號抑制)×飽和度權重×明度權重，
 * 讓鮮豔色優先於大面積淡色；最後去掉太相近的色。
 */
export function dominantColors(data: Uint8ClampedArray | number[], max = 6): string[] {
  const buckets = new Map<number, RGB & { n: number }>()
  let total = 0
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 128) continue // 透明（logo 去背區）
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r > 244 && g > 244 && b > 244) continue // 近白背景
    total++
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
    const bkt = buckets.get(key)
    if (bkt) {
      bkt.r += r
      bkt.g += g
      bkt.b += b
      bkt.n++
    } else {
      buckets.set(key, { r, g, b, n: 1 })
    }
  }

  const minCount = Math.max(1, total * 0.005) // 濾掉抗鋸齒雜點
  const scored = [...buckets.values()]
    .filter((v) => v.n >= minCount)
    .map((v) => {
      const c: RGB = { r: v.r / v.n, g: v.g / v.n, b: v.b / v.n }
      const { s, l } = satLight(c)
      const satWeight = 0.25 + 0.75 * s // 飽和度加權（留 0.25 底，灰階圖仍有結果）
      const lightWeight = 1 - Math.abs(l - 0.5) // 太黑／太白略降權
      const score = Math.sqrt(v.n) * satWeight * lightWeight
      return { c, score }
    })
    .sort((a, b) => b.score - a.score)

  const picked: RGB[] = []
  for (const { c } of scored) {
    if (picked.every((p) => dist(p, c) > 48)) picked.push(c) // 去掉太相近的
    if (picked.length >= max) break
  }
  return picked.map(toHex)
}

/** 載入圖片檔為可繪製的來源（優先 createImageBitmap，退回 <img>，SVG 亦可） */
async function loadImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      /* 部分格式（如某些 SVG）不支援，退回 <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** DOM：把圖片畫到小畫布取樣，回傳品牌重點色 hex 陣列 */
export async function extractColors(file: File, max = 6): Promise<string[]> {
  const img = await loadImage(file)
  const target = 120 // 縮小取樣，兼顧速度與代表性
  const scale = Math.min(1, target / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return []
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return dominantColors(data, max)
}
