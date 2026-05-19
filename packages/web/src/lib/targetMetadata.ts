import type { ActiveVideoTarget } from "../types"

export const TARGET_MARKER = "ACTIVE_VIDEO_TARGET:"

export function appendTargetMetadata(message: string, target?: ActiveVideoTarget | null): string {
  if (!target?.configPath) return message
  return `${message}\n\n${TARGET_MARKER} ${JSON.stringify(target)}`
}

export function stripTargetMetadata(content: string): string {
  const markerIndex = content.indexOf(`\n\n${TARGET_MARKER}`)
  if (markerIndex >= 0) return content.slice(0, markerIndex)

  const lineMarkerIndex = content.indexOf(TARGET_MARKER)
  return lineMarkerIndex >= 0 ? content.slice(0, lineMarkerIndex).trimEnd() : content
}

export function parseTargetMetadata(content: string): ActiveVideoTarget | null {
  const markerIndex = content.indexOf(TARGET_MARKER)
  if (markerIndex < 0) return null

  const raw = content.slice(markerIndex + TARGET_MARKER.length).trim()
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
    const record = parsed as Record<string, unknown>
    if (typeof record.configPath !== "string" || !record.configPath) return null

    const target: ActiveVideoTarget = { configPath: record.configPath }
    for (const key of ["configId", "jobId", "composition", "title"] as const) {
      if (typeof record[key] === "string" && record[key]) target[key] = record[key]
    }
    return target
  } catch {
    return null
  }
}
