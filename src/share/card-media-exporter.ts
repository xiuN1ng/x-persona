import type { GenerativeDNA } from '../ui/components/GenerativeCanvas'
import { OPEN_SOURCE_DISPLAY_HOST, OPEN_SOURCE_PAGE_URL } from './url-state'

export interface CardExportMetadata {
  screenName: string;
  displayName: string;
  titleZh: string;
  activeCode: string;
  slot: 'outer' | 'inner' | 'fusion';
  dna: GenerativeDNA;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * Generates a high-resolution social showcase poster PNG framing the card
 * together with the user's identity and the open-source GitHub Pages URL.
 */
export async function generateShowcasePosterBlob(
  cardDataUrl: string,
  meta: CardExportMetadata
): Promise<{ blob: Blob; dataUrl: string }> {
  const cardImg = await loadImage(cardDataUrl)
  const W = 880
  const H = 1280
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const { dna } = meta

  // 1. Deep Luxury Stage Background
  const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.44, 60, W * 0.5, H * 0.5, H * 0.75)
  bgGrad.addColorStop(0, dna.bgSecondary)
  bgGrad.addColorStop(0.55, dna.bgBase)
  bgGrad.addColorStop(1, '#04060d')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // 2. Ambient Aura Glows
  ctx.save()
  const aura1 = ctx.createRadialGradient(W * 0.5, H * 0.45, 20, W * 0.5, H * 0.45, 420)
  aura1.addColorStop(0, `${dna.primaryColor}38`)
  aura1.addColorStop(0.5, `${dna.secondaryColor}18`)
  aura1.addColorStop(1, 'transparent')
  ctx.fillStyle = aura1
  ctx.fillRect(0, 0, W, H)
  ctx.restore()

  // 3. Subtle Sacred Astrolabe Background Rings
  ctx.save()
  ctx.translate(W * 0.5, H * 0.46)
  ctx.strokeStyle = `${dna.primaryColor}26`
  ctx.lineWidth = 1.2
  for (const radius of [310, 360, 410]) {
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()

  // 4. Top Editorial Header
  ctx.save()
  ctx.textAlign = 'center'
  ctx.font = '600 18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
  ctx.fillStyle = dna.primaryColor
  ctx.fillText(
    `✦ X-PERSONA · ${meta.slot === 'outer' ? 'CYBER PERSONA' : meta.slot === 'inner' ? 'SOUL ARCHETYPE' : 'DUAL-WORLD FUSION'} ✦`,
    W * 0.5,
    62
  )
  ctx.restore()

  // 5. Draw Framed High-Res Card in Center
  const cardW = 640
  const cardH = Math.round((575 / 380) * cardW) // ~968px
  const cardX = Math.round((W - cardW) / 2)
  const cardY = 96

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.72)'
  ctx.shadowBlur = 48
  ctx.shadowOffsetY = 22
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 50)
  ctx.clip()
  ctx.drawImage(cardImg, cardX, cardY, cardW, cardH)
  ctx.restore()

  // Outer metallic rim around card
  ctx.save()
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 50)
  ctx.strokeStyle = `${dna.primaryColor}88`
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()

  // 6. Bottom Open-Source Showcase Banner (Carries Personal & Open-Source Pages URL)
  const barX = 68
  const barY = cardY + cardH + 38
  const barW = W - barX * 2
  const barH = 108

  ctx.save()
  drawRoundedRect(ctx, barX, barY, barW, barH, 24)
  ctx.fillStyle = 'rgba(9, 13, 24, 0.86)'
  ctx.fill()
  ctx.strokeStyle = `${dna.primaryColor}55`
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Left: User Identity & Title
  ctx.textAlign = 'left'
  ctx.fillStyle = '#f8fafc'
  ctx.font = 'bold 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText(`${meta.titleZh} · [${meta.activeCode}]`, barX + 28, barY + 44)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '500 18px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(`${meta.displayName} (@${meta.screenName}) · ${dna.rarityLabel}`, barX + 28, barY + 78)

  // Right: Open-Source Page URL Badge
  ctx.textAlign = 'right'
  ctx.fillStyle = dna.primaryColor
  ctx.font = 'bold 17px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText('🌐 开源在线测卡 Pages', barX + barW - 28, barY + 44)

  ctx.fillStyle = '#e2e8f0'
  ctx.font = 'bold 20px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(OPEN_SOURCE_DISPLAY_HOST, barX + barW - 28, barY + 78)
  ctx.restore()

  const dataUrl = canvas.toDataURL('image/png')
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png')
  })

  return { blob, dataUrl }
}

/**
 * Records a 5.0-second (60fps) seamless 360° 3D looping showcase video of the card
 * showing Front Face + 20px Metallic Slab Thickness + Back Face + Holographic Sheen +
 * Open-Source GitHub Pages URL banner.
 */
export async function recordCard5sLoopVideo(
  frontDataUrl: string,
  backDataUrl: string,
  meta: CardExportMetadata,
  onProgress?: (percent: number, angleDeg: number) => void
): Promise<{ blob: Blob; ext: 'mp4' | 'webm'; mimeType: string }> {
  const [frontImg, backImg] = await Promise.all([
    loadImage(frontDataUrl),
    loadImage(backDataUrl),
  ])

  const W = 720
  const H = 960
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Choose best supported video container (prefer MP4 for direct X upload compatibility)
  const candidateTypes: Array<{ mime: string; ext: 'mp4' | 'webm' }> = [
    { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
    { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ]

  let selected = candidateTypes[candidateTypes.length - 1]
  if (typeof MediaRecorder !== 'undefined') {
    for (const c of candidateTypes) {
      if (MediaRecorder.isTypeSupported(c.mime)) {
        selected = c
        break
      }
    }
  }

  const stream = canvas.captureStream(60)
  const recorder = new MediaRecorder(stream, {
    mimeType: selected.mime,
    videoBitsPerSecond: 6_500_000, // 6.5 Mbps crisp holographic quality
  })

  const chunks: BlobPart[] = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data)
    }
  }

  const recordingStopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: selected.mime }))
    }
  })

  const { dna } = meta
  // Pre-generate 28 seamless looping stardust particles
  const particles = Array.from({ length: 28 }, (_, i) => ({
    baseX: ((i * 97 + 43) % 100) / 100,
    baseY: ((i * 61 + 19) % 100) / 100,
    radius: 1.2 + (i % 3) * 1.1,
    phase: (i / 28) * Math.PI * 2,
    ampX: 14 + (i % 5) * 6,
    ampY: 18 + (i % 4) * 7,
  }))

  const DURATION_MS = 5000 // Exact 5.0-second seamless loop

  const renderFrame = (progress: number) => {
    // Seamless loop variable t in [0, 1)
    const t = Math.min(Math.max(progress, 0), 1)
    const angleRad = t * Math.PI * 2 // 0 -> 2π (360°)
    const angleDeg = (t * 360) % 360
    const cosA = Math.cos(angleRad)
    const sinA = Math.sin(angleRad)
    const floatY = Math.sin(angleRad) * 10

    // 1. Background Stage
    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 40, W * 0.5, H * 0.5, H * 0.72)
    bgGrad.addColorStop(0, dna.bgSecondary)
    bgGrad.addColorStop(0.55, dna.bgBase)
    bgGrad.addColorStop(1, '#04060c')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // 2. Pulsing Aura & Rotating Sacred Astrolabe Ring
    ctx.save()
    const auraRadius = 290 + Math.sin(angleRad * 2) * 25
    const aura = ctx.createRadialGradient(W * 0.5, H * 0.45 + floatY, 10, W * 0.5, H * 0.45 + floatY, auraRadius)
    aura.addColorStop(0, `${dna.primaryColor}42`)
    aura.addColorStop(0.55, `${dna.secondaryColor}1e`)
    aura.addColorStop(1, 'transparent')
    ctx.fillStyle = aura
    ctx.fillRect(0, 0, W, H)

    ctx.translate(W * 0.5, H * 0.45)
    ctx.rotate(angleRad * 0.5)
    ctx.strokeStyle = `${dna.primaryColor}28`
    ctx.lineWidth = 1.2
    ctx.setLineDash([8, 10])
    ctx.beginPath()
    ctx.arc(0, 0, 265, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.beginPath()
    ctx.arc(0, 0, 295, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // 3. Seamless Looping Stardust Particles
    ctx.save()
    for (const p of particles) {
      const px = p.baseX * W + Math.cos(angleRad + p.phase) * p.ampX
      const py = p.baseY * H + Math.sin(angleRad + p.phase) * p.ampY
      const alpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(angleRad * 2 + p.phase))
      ctx.fillStyle = p.radius > 2 ? dna.primaryColor : dna.foilColor
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(px, py, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // 4. Top Header Telemetry
    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillStyle = dna.primaryColor
    ctx.font = 'bold 14px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(
      `✦ X-PERSONA · 360° COLLECTIBLE CARD · ${Math.round(angleDeg)}° ✦`,
      W * 0.5,
      44
    )
    ctx.fillStyle = '#f8fafc'
    ctx.font = 'bold 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillText(`${meta.titleZh} [${meta.activeCode}]`, W * 0.5, 76)
    ctx.restore()

    // 5. 3D Rotating Card with 20px Extruded Metallic Slab Thickness
    const baseCardW = 430
    const baseCardH = Math.round((575 / 380) * baseCardW) // 651px
    const centerX = W * 0.5
    const centerY = H * 0.465 + floatY

    const activeImg = cosA >= 0 ? frontImg : backImg
    const faceScaleX = Math.max(Math.abs(cosA), 0.008)
    const slabThicknessPx = 22 * Math.abs(sinA) // Up to 22px physical thickness at 90° / 270°
    const edgeOffsetDir = sinA >= 0 ? 1 : -1

    // Drop Shadow on Stage Floor
    ctx.save()
    ctx.translate(centerX, centerY + baseCardH * 0.53)
    ctx.scale(0.35 + 0.65 * faceScaleX, 1)
    const floorShadow = ctx.createRadialGradient(0, 0, 5, 0, 0, baseCardW * 0.48)
    floorShadow.addColorStop(0, 'rgba(0, 0, 0, 0.65)')
    floorShadow.addColorStop(1, 'transparent')
    ctx.fillStyle = floorShadow
    ctx.beginPath()
    ctx.ellipse(0, 0, baseCardW * 0.48, 22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // 5a. Render 20px Extruded Metallic Slab Layers (Back-to-Front)
    const slabLayers = 14
    for (let s = slabLayers; s >= 1; s--) {
      const ratio = s / slabLayers
      const offsetX = edgeOffsetDir * slabThicknessPx * ratio
      const layerW = baseCardW * faceScaleX
      const lx = centerX - layerW * 0.5 + offsetX
      const ly = centerY - baseCardH * 0.5

      ctx.save()
      drawRoundedRect(ctx, lx, ly, Math.max(layerW, 4), baseCardH, Math.max(34 * faceScaleX, 3))
      const edgeGrad = ctx.createLinearGradient(lx, ly, lx, ly + baseCardH)
      edgeGrad.addColorStop(0, dna.primaryColor)
      edgeGrad.addColorStop(0.28, dna.foilColor)
      edgeGrad.addColorStop(0.5, '#1e293b')
      edgeGrad.addColorStop(0.72, dna.secondaryColor)
      edgeGrad.addColorStop(1, dna.primaryColor)
      ctx.fillStyle = edgeGrad
      ctx.fill()
      ctx.restore()
    }

    // 5b. Render Perspective-Foreshortened Front or Back Card Face (Strip-Sliced 3D Projection)
    if (faceScaleX > 0.025) {
      const strips = 36
      const fovDepth = 0.16 * sinA * (cosA >= 0 ? 1 : -1)

      for (let i = 0; i < strips; i++) {
        const u0 = i / strips
        const u1 = (i + 1) / strips
        const uMid = (u0 + u1) * 0.5 - 0.5 // -0.5 .. +0.5

        // Perspective foreshortening per vertical slice
        const perspectiveScale = 1 + uMid * fovDepth
        const sliceH = baseCardH * perspectiveScale
        const destX0 = centerX + (u0 - 0.5) * baseCardW * faceScaleX
        const destX1 = centerX + (u1 - 0.5) * baseCardW * faceScaleX
        const destW = Math.max(destX1 - destX0 + 0.8, 1)
        const destY = centerY - sliceH * 0.5

        const srcX = u0 * activeImg.width
        const srcW = Math.max((u1 - u0) * activeImg.width, 1)

        ctx.drawImage(
          activeImg,
          srcX,
          0,
          srcW,
          activeImg.height,
          destX0,
          destY,
          destW,
          sliceH
        )
      }

      // 5c. Dynamic Holographic Rainbow Foil & Specular Glare Sweep across the rotating face
      const projectedW = baseCardW * faceScaleX
      const faceLeft = centerX - projectedW * 0.5
      const faceTop = centerY - baseCardH * 0.5

      ctx.save()
      drawRoundedRect(ctx, faceLeft, faceTop, projectedW, baseCardH, 34 * faceScaleX)
      ctx.clip()

      const sheenCenter = faceLeft + ((Math.sin(angleRad * 2) + 1) * 0.5) * projectedW
      const sheenGrad = ctx.createLinearGradient(
        sheenCenter - projectedW * 0.45,
        faceTop,
        sheenCenter + projectedW * 0.45,
        faceTop + baseCardH
      )
      sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
      sheenGrad.addColorStop(0.42, `${dna.primaryColor}22`)
      sheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.36)')
      sheenGrad.addColorStop(0.58, `${dna.secondaryColor}22`)
      sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = sheenGrad
      ctx.fillRect(faceLeft, faceTop, projectedW, baseCardH)
      ctx.restore()
    }

    // 6. Bottom Open-Source Pages Banner (Carries Personal Identity & Open-Source URL)
    const footerW = 636
    const footerH = 74
    const footerX = (W - footerW) / 2
    const footerY = H - 96

    ctx.save()
    drawRoundedRect(ctx, footerX, footerY, footerW, footerH, 20)
    ctx.fillStyle = 'rgba(10, 14, 26, 0.88)'
    ctx.fill()
    ctx.strokeStyle = `${dna.primaryColor}66`
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = '#f8fafc'
    ctx.font = 'bold 18px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(`@${meta.screenName}`, footerX + 22, footerY + 31)

    ctx.fillStyle = '#94a3b8'
    ctx.font = '500 14px system-ui, -apple-system, sans-serif'
    ctx.fillText(`${dna.rarityLabel} · 5s 360° 炫光展示`, footerX + 22, footerY + 55)

    ctx.textAlign = 'right'
    ctx.fillStyle = dna.primaryColor
    ctx.font = 'bold 14px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText('🌐 开源测卡 Pages', footerX + footerW - 22, footerY + 30)

    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 17px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(OPEN_SOURCE_DISPLAY_HOST, footerX + footerW - 22, footerY + 55)
    ctx.restore()
  }

  // Render initial frame before starting recorder
  renderFrame(0)
  recorder.start(100)

  const startTime = performance.now()
  await new Promise<void>((resolve) => {
    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / DURATION_MS, 1)
      renderFrame(progress)
      onProgress?.(Math.round(progress * 100), Math.round((progress * 360) % 360))

      if (elapsed < DURATION_MS) {
        requestAnimationFrame(step)
      } else {
        resolve()
      }
    }
    requestAnimationFrame(step)
  })

  recorder.stop()
  const blob = await recordingStopped

  return {
    blob,
    ext: selected.ext,
    mimeType: selected.mime,
  }
}

/**
 * Helper to trigger file download in browser
 */
export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/**
 * Attempts to copy a PNG Blob directly to the system clipboard (so the user can Ctrl+V straight into X compose)
 */
export async function copyPngBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof ClipboardItem !== 'undefined'
    ) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      return true
    }
  } catch (err) {
    console.warn('[Share] Clipboard image write not permitted or unsupported:', err)
  }
  return false
}

/**
 * Attempts native Web Share API with file attachment (mobile iOS/Android & supported desktops)
 */
export async function tryNativeFileShare(
  file: File,
  title: string,
  text: string
): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title,
        text: `${text}\n${OPEN_SOURCE_PAGE_URL}`,
        files: [file],
      })
      return true
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return true // User intentionally closed native share sheet
    }
    console.warn('[Share] Native file share fallback:', err)
  }
  return false
}
