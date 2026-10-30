import type { AvatarVisualFeatures } from './types'

function fnv1aHash(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      case bn:
        h = (rn - gn) / d + 4
        break
    }
    h /= 6
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  const hn = ((h % 360) + 360) % 360
  const sn = Math.max(0, Math.min(100, s)) / 100
  const ln = Math.max(0, Math.min(100, l)) / 100

  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1))
  const m = ln - c / 2
  let r = 0
  let g = 0
  let b = 0

  if (hn < 60) [r, g, b] = [c, x, 0]
  else if (hn < 120) [r, g, b] = [x, c, 0]
  else if (hn < 180) [r, g, b] = [0, c, x]
  else if (hn < 240) [r, g, b] = [0, x, c]
  else if (hn < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`
}

/**
 * Upgrade Twitter `_normal.jpg` (48x48) to crisp `_400x400.jpg`
 */
export function upgradeTwitterAvatarUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  if (rawUrl.startsWith('data:')) return rawUrl
  return rawUrl.replace(/_(normal|bigger|mini)\.(jpg|jpeg|png|webp|gif)/i, '_400x400.$2')
}

/**
 * Build candidate CORS-safe avatar URLs in priority order:
 * 1. wsrv.nl Cloudflare global proxy (bypasses pbs.twimg.com blocks & tracking prevention, adds CORS *)
 * 2. images.weserv.nl backup mirror
 * 3. unavatar.io X handle resolver
 * 4. Direct upgraded 400x400 pbs.twimg.com URL
 * 5. Direct original URL
 */
export function getAvatarCandidateUrls(rawUrl: string, screenName: string): string[] {
  const cleanHandle = screenName.trim().replace(/^@+/, '')
  const hiRes = upgradeTwitterAvatarUrl(rawUrl)
  const candidates: string[] = []

  if (hiRes && hiRes.startsWith('http')) {
    candidates.push(
      `https://wsrv.nl/?url=${encodeURIComponent(hiRes)}&w=240&h=240&fit=cover&output=jpg`
    )
    candidates.push(
      `https://images.weserv.nl/?url=${encodeURIComponent(hiRes)}&w=240&h=240&fit=cover&output=jpg`
    )
  }
  if (cleanHandle) {
    candidates.push(`https://unavatar.io/x/${encodeURIComponent(cleanHandle)}?fallback=false`)
  }
  if (hiRes && hiRes.startsWith('http')) {
    candidates.push(hiRes)
  }
  if (rawUrl && rawUrl.startsWith('http') && rawUrl !== hiRes) {
    candidates.push(rawUrl)
  }

  return candidates
}

/**
 * Pure pixel-buffer analyzer: extracts dominant hues, luminance, saturation, warmth,
 * Sobel edge detail density, and a 32-bit perceptual hash from an RGBA pixel array.
 */
export function analyzeAvatarPixels(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
  seedStr = 'xpersona'
): AvatarVisualFeatures {
  // 12 hue buckets (30 degrees each)
  const hueBuckets = Array.from({ length: 12 }, () => ({
    weight: 0,
    rSum: 0,
    gSum: 0,
    bSum: 0,
    hSum: 0,
    sSum: 0,
    lSum: 0,
    count: 0,
  }))

  let totalLum = 0
  let totalSat = 0
  let warmWeight = 0
  let coolWeight = 0
  let validPixels = 0
  const lumValues: number[] = []
  const grayGrid = new Float32Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx] ?? 0
      const g = data[idx + 1] ?? 0
      const b = data[idx + 2] ?? 0
      const a = data[idx + 3] ?? 255

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      grayGrid[y * width + x] = lum

      if (a < 40) continue

      const [h, s, l] = rgbToHsl(r, g, b)
      totalLum += lum * 100
      totalSat += s
      lumValues.push(lum * 100)
      validPixels++

      // Center weighting (pixels closer to center of avatar portrait count more)
      const dx = (x / width - 0.5) * 2
      const dy = (y / height - 0.5) * 2
      const distSq = dx * dx + dy * dy
      const centerWeight = Math.max(0.25, 1.2 - distSq * 0.65)

      // Chromatic weight favors saturated, mid-luminance pixels for palette extraction
      const chromaFactor = (s / 100) * (1 - Math.abs(l - 52) / 65)
      const w = Math.max(0.05, chromaFactor * centerWeight)

      const bucketIdx = Math.floor(((h % 360) / 360) * 12) % 12
      const bucket = hueBuckets[bucketIdx]
      bucket.weight += w
      bucket.rSum += r * w
      bucket.gSum += g * w
      bucket.bSum += b * w
      bucket.hSum += h * w
      bucket.sSum += s * w
      bucket.lSum += l * w
      bucket.count++

      // Warm hues: 0..75 deg & 290..360 deg; Cool hues: 140..275 deg
      if (h <= 75 || h >= 295) {
        warmWeight += (s / 100) + 0.15
      } else if (h >= 135 && h <= 275) {
        coolWeight += (s / 100) + 0.15
      }
    }
  }

  if (validPixels === 0) {
    return computeDeterministicAvatarFallback(seedStr)
  }

  const avgLum = Math.round(totalLum / validPixels)
  const avgSat = Math.round(totalSat / validPixels)

  // Contrast = standard deviation of pixel luminance (scaled 0-100)
  let varianceSum = 0
  for (const lv of lumValues) {
    varianceSum += (lv - avgLum) * (lv - avgLum)
  }
  const stdDev = Math.sqrt(varianceSum / validPixels)
  const contrast = Math.min(100, Math.round(stdDev * 2.6))

  // Sobel edge gradient energy for detailDensity
  let edgeSum = 0
  let edgeCount = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        -grayGrid[(y - 1) * width + (x - 1)] +
        grayGrid[(y - 1) * width + (x + 1)] -
        2 * grayGrid[y * width + (x - 1)] +
        2 * grayGrid[y * width + (x + 1)] -
        grayGrid[(y + 1) * width + (x - 1)] +
        grayGrid[(y + 1) * width + (x + 1)]
      const gy =
        -grayGrid[(y - 1) * width + (x - 1)] -
        2 * grayGrid[(y - 1) * width + x] -
        grayGrid[(y - 1) * width + (x + 1)] +
        grayGrid[(y + 1) * width + (x - 1)] +
        2 * grayGrid[(y + 1) * width + x] +
        grayGrid[(y + 1) * width + (x + 1)]
      edgeSum += Math.sqrt(gx * gx + gy * gy)
      edgeCount++
    }
  }
  const avgEdge = edgeCount > 0 ? edgeSum / edgeCount : 0.2
  const detailDensity = Math.min(100, Math.max(8, Math.round(avgEdge * 185)))

  // Sort hue buckets by weight to find dominant & secondary colors
  const sorted = hueBuckets
    .map((b, idx) => ({ ...b, idx }))
    .sort((a, b) => b.weight - a.weight)

  const top1 = sorted[0]
  // Pick secondary bucket that is at least 2 buckets away on the color wheel for rich harmony
  const top2 =
    sorted.find((b) => {
      const dist = Math.abs(b.idx - top1.idx)
      const circularDist = Math.min(dist, 12 - dist)
      return circularDist >= 2 && b.weight > 0
    }) || sorted[1] || top1

  const top3 =
    sorted.find((b) => b.idx !== top1.idx && b.idx !== top2.idx && b.weight > 0) || top2

  const extractBucketColor = (b: typeof top1, boostSat = 18) => {
    if (b.weight <= 0.001) {
      const h = (fnv1aHash(seedStr) + b.idx * 60) % 360
      return { hex: hslToHex(h, 68, 55), hue: h }
    }
    const r = b.rSum / b.weight
    const g = b.gSum / b.weight
    const bl = b.bSum / b.weight
    const [h, s, l] = rgbToHsl(r, g, bl)
    // Ensure extracted card colors have enough vibrancy to look gorgeous on procedural shaders
    const finalS = Math.min(92, Math.max(38, s + boostSat))
    const finalL = Math.min(72, Math.max(38, l))
    return {
      hex: hslToHex(h, finalS, finalL),
      rawHex: rgbToHex(r, g, bl),
      hue: h,
    }
  }

  const c1 = extractBucketColor(top1, 20)
  const c2 = extractBucketColor(top2, 22)
  const c3 = extractBucketColor(top3, 25)
  const c4Hue = (c1.hue + 150) % 360
  const c4Hex = hslToHex(c4Hue, Math.max(55, avgSat + 15), 58)

  // Compute perceptual hash over an 8x8 downsampled grid
  let pHash = 2166136261 >>> 0
  const stepX = Math.max(1, Math.floor(width / 8))
  const stepY = Math.max(1, Math.floor(height / 8))
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const px = Math.min(width - 1, gx * stepX)
      const py = Math.min(height - 1, gy * stepY)
      const idx = (py * width + px) * 4
      const qR = (data[idx] ?? 0) >> 4
      const qG = (data[idx + 1] ?? 0) >> 4
      const qB = (data[idx + 2] ?? 0) >> 4
      const packed = (qR << 8) | (qG << 4) | qB
      pHash ^= packed
      pHash = Math.imul(pHash, 16777619)
    }
  }

  const warmth = Math.round((warmWeight / Math.max(0.01, warmWeight + coolWeight)) * 100)

  return {
    dominantColorHex: c1.hex,
    secondaryColorHex: c2.hex,
    accentColorHex: c3.hex,
    dominantHue: c1.hue,
    secondaryHue: c2.hue,
    luminance: avgLum,
    saturation: avgSat,
    warmth,
    contrast,
    detailDensity,
    perceptualHash: pHash >>> 0,
    paletteSwatches: [c1.hex, c2.hex, c3.hex, c4Hex],
    isExtractedFromPixels: true,
  }
}

/**
 * Deterministic fallback when offline or before image pixels finish decoding
 */
export function computeDeterministicAvatarFallback(screenName: string): AvatarVisualFeatures {
  const h = fnv1aHash(screenName.toLowerCase())
  const dominantHue = h % 360
  const secondaryHue = (dominantHue + 115 + ((h >>> 8) % 50)) % 360
  const accentHue = (dominantHue + 210) % 360

  const dominantColorHex = hslToHex(dominantHue, 74, 54)
  const secondaryColorHex = hslToHex(secondaryHue, 70, 52)
  const accentColorHex = hslToHex(accentHue, 80, 60)
  const fourthHex = hslToHex((dominantHue + 45) % 360, 65, 58)

  return {
    dominantColorHex,
    secondaryColorHex,
    accentColorHex,
    dominantHue,
    secondaryHue,
    luminance: 35 + ((h >>> 4) % 45),
    saturation: 48 + ((h >>> 10) % 40),
    warmth: 25 + ((h >>> 16) % 55),
    contrast: 45 + ((h >>> 20) % 40),
    detailDensity: 40 + ((h >>> 12) % 48),
    perceptualHash: h >>> 0,
    paletteSwatches: [dominantColorHex, secondaryColorHex, accentColorHex, fourthHex],
    isExtractedFromPixels: false,
  }
}

/**
 * Generates a crisp geometric SVG DataURL avatar when all network image gateways fail
 */
export function generateProceduralAvatarDataUrl(
  screenName: string,
  features: AvatarVisualFeatures
): string {
  const initial = (screenName.replace(/^@/, '')[0] || 'X').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${features.dominantColorHex}" />
        <stop offset="55%" stop-color="${features.secondaryColorHex}" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="28" fill="url(#bg)" />
    <circle cx="80" cy="80" r="62" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2" stroke-dasharray="6 4" />
    <polygon points="80,18 134,50 134,110 80,142 26,110 26,50" fill="rgba(15,23,42,0.38)" stroke="${features.accentColorHex}" stroke-width="2" />
    <text x="80" y="98" text-anchor="middle" fill="#ffffff" font-family="monospace, sans-serif" font-weight="900" font-size="56">${initial}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

async function fetchImageElementWithTimeout(url: string, timeoutMs = 4500): Promise<HTMLImageElement> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      mode: 'cors',
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const blob = await res.blob()
    if (!blob.type.startsWith('image/') && blob.size < 200) {
      throw new Error('Invalid image blob')
    }
    const objUrl = URL.createObjectURL(blob)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('Image decode failed'))
        el.src = objUrl
      })
      return img
    } finally {
      // Revoke after slight delay so canvas draw completes safely
      setTimeout(() => URL.revokeObjectURL(objUrl), 1500)
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolves the user's X avatar across multiple CORS-clean CDN gateways,
 * converts it to an inline Base64 DataURL (100% immune to tracking blockers & canvas taint),
 * and extracts pixel-level AvatarVisualFeatures to weight the card's generative style.
 */
export async function resolveAvatarAndExtractFeatures(
  rawUrl: string,
  screenName: string
): Promise<{ avatarDataUrl: string; avatarFeatures: AvatarVisualFeatures }> {
  const fallbackFeatures = computeDeterministicAvatarFallback(screenName)

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      avatarDataUrl: generateProceduralAvatarDataUrl(screenName, fallbackFeatures),
      avatarFeatures: fallbackFeatures,
    }
  }

  // If rawUrl is already a data:image URL, decode it directly to extract pixel features
  if (rawUrl && rawUrl.startsWith('data:image/')) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('DataURL decode failed'))
        el.src = rawUrl
      })
      const sampleCanvas = document.createElement('canvas')
      sampleCanvas.width = 48
      sampleCanvas.height = 48
      const ctx = sampleCanvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, 48, 48)
        const imgData = ctx.getImageData(0, 0, 48, 48)
        const features = analyzeAvatarPixels(imgData.data, 48, 48, screenName)
        return { avatarDataUrl: rawUrl, avatarFeatures: features }
      }
    } catch {
      // continue to network candidates
    }
  }

  const candidates = getAvatarCandidateUrls(rawUrl, screenName)

  for (const url of candidates) {
    try {
      const img = await fetchImageElementWithTimeout(url, 4200)

      // 1. Render 160x160 crisp DataURL for permanent display & PNG export
      const outCanvas = document.createElement('canvas')
      outCanvas.width = 160
      outCanvas.height = 160
      const outCtx = outCanvas.getContext('2d')
      if (!outCtx) continue
      outCtx.drawImage(img, 0, 0, 160, 160)
      const avatarDataUrl = outCanvas.toDataURL('image/jpeg', 0.92)

      // 2. Render 48x48 analysis grid for pixel feature extraction
      const sampleCanvas = document.createElement('canvas')
      sampleCanvas.width = 48
      sampleCanvas.height = 48
      const sampleCtx = sampleCanvas.getContext('2d')
      if (!sampleCtx) {
        return { avatarDataUrl, avatarFeatures: fallbackFeatures }
      }
      sampleCtx.drawImage(img, 0, 0, 48, 48)
      const imgData = sampleCtx.getImageData(0, 0, 48, 48)
      const avatarFeatures = analyzeAvatarPixels(imgData.data, 48, 48, screenName)

      return { avatarDataUrl, avatarFeatures }
    } catch {
      // Try next candidate gateway
    }
  }

  // Fallback to procedural SVG DataURL so avatar is never broken
  return {
    avatarDataUrl: generateProceduralAvatarDataUrl(screenName, fallbackFeatures),
    avatarFeatures: fallbackFeatures,
  }
}
