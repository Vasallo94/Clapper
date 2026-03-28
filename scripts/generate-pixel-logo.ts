import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

type Rgba = {
  r: number
  g: number
  b: number
  a: number
}

const sourcePath = path.resolve(process.argv[2] ?? "public/logos/pixel-skull/source.png")
const outDir = path.resolve("src/compositions/ClaudeCodeTutorial/components/pixel-art")
const outMapPath = path.join(outDir, "pixelSkullMap.ts")
const previewDir = path.resolve("public/logos/pixel-skull")
const previewSvgPath = path.join(previewDir, "preview.svg")

const targetWidth = 64
const targetHeight = 96
const padding = 4

const palette = ["transparent", "#050505", "#2c2c2c", "#676767", "#b8b8b8", "#ffffff"] as const

const probe = JSON.parse(
  execFileSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", sourcePath],
    { encoding: "utf8" },
  ),
) as {
  streams: Array<{ width: number; height: number }>
}

const width = probe.streams[0]?.width
const height = probe.streams[0]?.height

if (!width || !height) {
  throw new Error(`Could not determine image size for ${sourcePath}`)
}

const raw = execFileSync(
  "ffmpeg",
  ["-v", "error", "-i", sourcePath, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
  {
    encoding: "buffer",
    maxBuffer: width * height * 4 + 1024,
  },
)

const getPixel = (x: number, y: number): Rgba => {
  const index = (y * width + x) * 4
  return {
    r: raw[index] ?? 0,
    g: raw[index + 1] ?? 0,
    b: raw[index + 2] ?? 0,
    a: raw[index + 3] ?? 0,
  }
}

const luminance = ({ r, g, b }: Rgba) => Math.round(r * 0.2126 + g * 0.7152 + b * 0.0722)

const isVisible = (pixel: Rgba) => pixel.a > 18 && luminance(pixel) > 8

const bounds = {
  minX: width,
  minY: height,
  maxX: 0,
  maxY: 0,
}

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const pixel = getPixel(x, y)
    if (!isVisible(pixel)) continue
    bounds.minX = Math.min(bounds.minX, x)
    bounds.minY = Math.min(bounds.minY, y)
    bounds.maxX = Math.max(bounds.maxX, x)
    bounds.maxY = Math.max(bounds.maxY, y)
  }
}

if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
  throw new Error("Could not find non-transparent bounds in source image")
}

const cropWidth = bounds.maxX - bounds.minX + 1
const cropHeight = bounds.maxY - bounds.minY + 1
const scale = Math.min((targetWidth - padding * 2) / cropWidth, (targetHeight - padding * 2) / cropHeight)
const drawWidth = Math.max(1, Math.round(cropWidth * scale))
const drawHeight = Math.max(1, Math.round(cropHeight * scale))
const offsetX = Math.floor((targetWidth - drawWidth) / 2)
const offsetY = Math.floor((targetHeight - drawHeight) / 2)

const sampleAverage = (srcStartX: number, srcEndX: number, srcStartY: number, srcEndY: number): Rgba => {
  let totalAlpha = 0
  let totalR = 0
  let totalG = 0
  let totalB = 0
  let totalPixels = 0

  const startX = Math.max(bounds.minX, Math.floor(srcStartX))
  const endX = Math.min(bounds.maxX + 1, Math.ceil(srcEndX))
  const startY = Math.max(bounds.minY, Math.floor(srcStartY))
  const endY = Math.min(bounds.maxY + 1, Math.ceil(srcEndY))

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const pixel = getPixel(x, y)
      const alphaWeight = pixel.a / 255
      totalR += pixel.r * alphaWeight
      totalG += pixel.g * alphaWeight
      totalB += pixel.b * alphaWeight
      totalAlpha += pixel.a
      totalPixels += 1
    }
  }

  if (totalPixels === 0 || totalAlpha === 0) {
    return { r: 0, g: 0, b: 0, a: 0 }
  }

  const avgAlpha = Math.round(totalAlpha / totalPixels)
  const alphaWeight = totalAlpha / 255

  return {
    r: Math.round(totalR / alphaWeight),
    g: Math.round(totalG / alphaWeight),
    b: Math.round(totalB / alphaWeight),
    a: avgAlpha,
  }
}

const quantize = (pixel: Rgba) => {
  if (pixel.a < 24) return 0

  const lightness = luminance(pixel)
  if (lightness < 32) return 1
  if (lightness < 78) return 2
  if (lightness < 138) return 3
  if (lightness < 212) return 4
  return 5
}

const grid = Array.from({ length: targetHeight }, () => Array.from({ length: targetWidth }, () => 0))

for (let y = 0; y < drawHeight; y += 1) {
  for (let x = 0; x < drawWidth; x += 1) {
    const srcStartX = bounds.minX + (x / drawWidth) * cropWidth
    const srcEndX = bounds.minX + ((x + 1) / drawWidth) * cropWidth
    const srcStartY = bounds.minY + (y / drawHeight) * cropHeight
    const srcEndY = bounds.minY + ((y + 1) / drawHeight) * cropHeight
    const sampled = sampleAverage(srcStartX, srcEndX, srcStartY, srcEndY)
    grid[offsetY + y][offsetX + x] = quantize(sampled)
  }
}

const neighborOffsets = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
]

const cloneGrid = (source: number[][]) => source.map((row) => [...row])

const cleanupIsolatedPixels = (source: number[][]) => {
  const next = cloneGrid(source)

  for (let y = 1; y < targetHeight - 1; y += 1) {
    for (let x = 1; x < targetWidth - 1; x += 1) {
      const value = source[y][x]
      const neighbors = neighborOffsets.map(([dx, dy]) => source[y + dy][x + dx]).filter((neighbor) => neighbor > 0)

      if (value > 0 && neighbors.length <= 1) {
        next[y][x] = 0
      }

      if (value === 0 && neighbors.length >= 6) {
        const byFrequency = neighbors.reduce<Record<number, number>>((acc, neighbor) => {
          acc[neighbor] = (acc[neighbor] ?? 0) + 1
          return acc
        }, {})

        const dominant = Object.entries(byFrequency).sort((a, b) => b[1] - a[1])[0]
        next[y][x] = dominant ? Number(dominant[0]) : 0
      }
    }
  }

  return next
}

const reinforceOutline = (source: number[][]) => {
  const next = cloneGrid(source)

  for (let y = 1; y < targetHeight - 1; y += 1) {
    for (let x = 1; x < targetWidth - 1; x += 1) {
      if (source[y][x] > 0) continue
      const neighbors = neighborOffsets.map(([dx, dy]) => source[y + dy][x + dx])
      const hasLight = neighbors.some((neighbor) => neighbor >= 4)
      const hasDark = neighbors.some((neighbor) => neighbor > 0 && neighbor <= 2)

      if (hasLight && hasDark) {
        next[y][x] = 1
      }
    }
  }

  return next
}

const darkenEdgePixels = (source: number[][]) => {
  const next = cloneGrid(source)

  for (let y = 1; y < targetHeight - 1; y += 1) {
    for (let x = 1; x < targetWidth - 1; x += 1) {
      const value = source[y][x]
      if (value <= 1) continue

      const touchesTransparency = neighborOffsets.some(([dx, dy]) => source[y + dy][x + dx] === 0)
      if (touchesTransparency) {
        next[y][x] = Math.max(1, value - 1)
      }
    }
  }

  return next
}

const normalizeHighlights = (source: number[][]) => {
  const next = cloneGrid(source)

  for (let y = 1; y < targetHeight - 1; y += 1) {
    for (let x = 1; x < targetWidth - 1; x += 1) {
      const value = source[y][x]
      if (value < 4) continue

      const brightNeighbors = neighborOffsets.filter(([dx, dy]) => source[y + dy][x + dx] >= value).length
      if (brightNeighbors <= 1) {
        next[y][x] = value - 1
      }
    }
  }

  return next
}

const blendMinorityPixels = (source: number[][]) => {
  const next = cloneGrid(source)

  for (let y = 1; y < targetHeight - 1; y += 1) {
    for (let x = 1; x < targetWidth - 1; x += 1) {
      const value = source[y][x]
      if (value === 0) continue

      const byFrequency = neighborOffsets.reduce<Record<number, number>>((acc, [dx, dy]) => {
        const neighbor = source[y + dy][x + dx]
        if (neighbor > 0) {
          acc[neighbor] = (acc[neighbor] ?? 0) + 1
        }
        return acc
      }, {})

      const dominant = Object.entries(byFrequency).sort((a, b) => b[1] - a[1])[0]
      if (dominant && dominant[1] >= 5 && Number(dominant[0]) !== value) {
        next[y][x] = Number(dominant[0])
      }
    }
  }

  return next
}

const eraseRect = (source: number[][], x: number, y: number, widthPx: number, heightPx: number) => {
  for (let row = y; row < y + heightPx; row += 1) {
    for (let col = x; col < x + widthPx; col += 1) {
      if (row >= 0 && row < targetHeight && col >= 0 && col < targetWidth) {
        source[row][col] = 0
      }
    }
  }
}

const fillRect = (source: number[][], x: number, y: number, widthPx: number, heightPx: number, value: number) => {
  for (let row = y; row < y + heightPx; row += 1) {
    for (let col = x; col < x + widthPx; col += 1) {
      if (row >= 0 && row < targetHeight && col >= 0 && col < targetWidth) {
        source[row][col] = value
      }
    }
  }
}

const applyArtDirection = (source: number[][]) => {
  const next = cloneGrid(source)

  // Remove the small forehead blemish inherited from the source image.
  eraseRect(next, 39, 31, 3, 2)

  // Strengthen the pipe bowl silhouette and smoke base.
  fillRect(next, 10, 54, 3, 2, 1)
  fillRect(next, 12, 49, 2, 2, 2)
  eraseRect(next, 9, 44, 2, 3)

  // Sharpen the lower beard tip for a cleaner sprite read.
  fillRect(next, 33, 86, 2, 2, 1)
  fillRect(next, 32, 88, 4, 1, 1)

  return next
}

let cleaned = cleanupIsolatedPixels(grid)
cleaned = cleanupIsolatedPixels(cleaned)
cleaned = reinforceOutline(cleaned)
cleaned = darkenEdgePixels(cleaned)
cleaned = normalizeHighlights(cleaned)
cleaned = blendMinorityPixels(cleaned)
cleaned = applyArtDirection(cleaned)

const rows = cleaned.map((row) => row.join(""))

const svgRects: string[] = []
for (let y = 0; y < cleaned.length; y += 1) {
  for (let x = 0; x < cleaned[y].length; x += 1) {
    const colorIndex = cleaned[y][x]
    if (colorIndex === 0) continue
    svgRects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[colorIndex]}" />`)
  }
}

const mapSource = `export const pixelSkullPalette = ${JSON.stringify(palette)} as const

export const pixelSkullMap = {
  width: ${targetWidth},
  height: ${targetHeight},
  palette: pixelSkullPalette,
  data: ${JSON.stringify(rows, null, 2)},
} as const

export type PixelSkullMap = typeof pixelSkullMap
`

const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${targetWidth} ${targetHeight}" shape-rendering="crispEdges">
  <rect width="${targetWidth}" height="${targetHeight}" fill="#000000" />
  ${svgRects.join("\n  ")}
</svg>
`

mkdirSync(outDir, { recursive: true })
mkdirSync(previewDir, { recursive: true })
writeFileSync(outMapPath, mapSource)
writeFileSync(previewSvgPath, svgSource)

console.log(`Generated pixel logo map at ${outMapPath}`)
console.log(`Generated preview at ${previewSvgPath}`)
