import type { AgentArtifact, ValidationReportData } from "../types"

const VALIDATION_KEYS = ["errors", "warnings", "recommendations"] as const

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).filter(Boolean)
}

function isValidationReport(value: Record<string, unknown>): boolean {
  return VALIDATION_KEYS.some((key) => Array.isArray(value[key]))
}

function toValidationReport(value: Record<string, unknown>): ValidationReportData {
  return {
    type: "validation_report",
    errors: normalizeStringList(value.errors),
    warnings: normalizeStringList(value.warnings),
    recommendations: normalizeStringList(value.recommendations),
  }
}

function artifactTitle(toolName: string, fallback: string): string {
  if (toolName === "validate_config") return "Validacion tecnica"
  if (toolName === "audit_content_quality") return "Auditoria editorial"
  if (toolName === "present_audio_chart") return "Carta de audio"
  if (toolName === "present_escaleta") return "Escaleta"
  if (toolName === "present_direction") return "Direccion editorial"
  return fallback
}

function stableId(toolName: string, content: string, idSeed?: string): string {
  if (idSeed) return `${toolName}:${idSeed}`
  let hash = 5381
  for (let i = 0; i < content.length; i += 1) {
    hash = (hash * 33) ^ content.charCodeAt(i)
  }
  return `${toolName}:${(hash >>> 0).toString(36)}`
}

export function extractArtifactFromToolMessage(
  toolName: string,
  content?: string,
  idSeed?: string,
): AgentArtifact | null {
  if (!content?.trim()) return null

  const parsed = parseJson(content)
  const parsedRecord = asRecord(parsed)

  if (parsedRecord?.error === "validation_failed" && Array.isArray(parsedRecord.errors)) {
    return {
      id: stableId(toolName, content, idSeed),
      kind: "validation",
      title: "Errores de validacion pre-render",
      source: toolName,
      data: toValidationReport({
        errors: parsedRecord.errors,
        warnings: [],
        recommendations: parsedRecord.mutations ?? [],
      }) as unknown as Record<string, unknown>,
      createdAt: Date.now(),
    }
  }

  if (parsedRecord && isValidationReport(parsedRecord)) {
    return {
      id: stableId(toolName, content, idSeed),
      kind: "validation",
      title: artifactTitle(toolName, "Validacion"),
      source: toolName,
      data: toValidationReport(parsedRecord) as unknown as Record<string, unknown>,
      createdAt: Date.now(),
    }
  }

  if (parsedRecord?.voiceover || parsedRecord?.sound_design || parsedRecord?.soundDesign) {
    return {
      id: stableId(toolName, content, idSeed),
      kind: "audio_chart",
      title: artifactTitle(toolName, "Carta de audio"),
      source: toolName,
      data: parsedRecord,
      createdAt: Date.now(),
    }
  }

  if (toolName === "route_intent" && typeof parsedRecord?.mode === "string") {
    return {
      id: stableId(toolName, content, idSeed),
      kind: "intent_decision",
      title: `Modo: ${parsedRecord.mode}`,
      source: toolName,
      data: parsedRecord,
      createdAt: Date.now(),
    }
  }

  if (parsedRecord?.scenes) {
    return {
      id: stableId(toolName, content, idSeed),
      kind: "script",
      title: artifactTitle(toolName, "Guion / escaleta"),
      source: toolName,
      data: parsedRecord,
      createdAt: Date.now(),
    }
  }

  if (toolName === "validate_config" || toolName === "audit_content_quality") {
    return {
      id: stableId(toolName, content, idSeed),
      kind: "tool_output",
      title: artifactTitle(toolName, "Salida de herramienta"),
      source: toolName,
      content,
      createdAt: Date.now(),
    }
  }

  return null
}
