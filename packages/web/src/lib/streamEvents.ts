import { extractArtifactFromToolMessage } from "./artifacts"
import type { AgentArtifact, ToolEntry } from "../types"

export interface ToolCallLike {
  id?: string
  name?: string
  args?: Record<string, unknown> | string
}

export interface ToolMessageLike {
  content?: string
  name?: string
  tool_call_id?: string
  toolCallId?: string
}

export interface ToolResultUpdate {
  tools: ToolEntry[]
  artifacts: AgentArtifact[]
}

function stableHash(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function stringifyArgs(args: ToolCallLike["args"]): string | undefined {
  if (!args) return undefined
  return typeof args === "string" ? args : JSON.stringify(args)
}

function toolSignature(name: string, args?: ToolCallLike["args"]): string {
  return `${name}:${stableHash(stringifyArgs(args) ?? "")}`
}

function toolEntryId(call: ToolCallLike): string {
  if (call.id) return call.id
  return toolSignature(call.name ?? "tool", call.args)
}

function artifactSignature(artifact: AgentArtifact): string {
  return JSON.stringify({
    id: artifact.id,
    kind: artifact.kind,
    source: artifact.source ?? null,
    content: artifact.content ?? null,
    data: artifact.data ?? null,
  })
}

function upsertArtifact(existing: AgentArtifact[], artifact: AgentArtifact | null): AgentArtifact[] {
  if (!artifact) return existing
  const nextSignature = artifactSignature(artifact)
  if (existing.some((item) => artifactSignature(item) === nextSignature || item.id === artifact.id)) return existing
  return [...existing, artifact]
}

export function isToolError(content?: string): boolean {
  if (!content || typeof content !== "string") return false
  const trimmed = content.trimStart()
  if (/^[Ee]rror\b/.test(trimmed)) return true
  try {
    const parsed = JSON.parse(content)
    return Boolean(parsed && typeof parsed === "object" && typeof parsed.error === "string")
  } catch {
    return false
  }
}

export function mergeStreamingText(previous: string, next: string): string {
  if (!previous) return next.slice(-4000)
  if (next.startsWith(previous)) return next.slice(-4000)
  if (previous.endsWith(next)) return previous
  return `${previous}${next}`.slice(-4000)
}

export function extractSubagentName(toolCalls: ToolCallLike[]): string | null {
  const taskCall = toolCalls.find((tc) => tc.name === "task")
  if (!taskCall?.args || typeof taskCall.args !== "object") return null
  return typeof taskCall.args.subagent_type === "string" ? taskCall.args.subagent_type : null
}

export function appendToolCalls(existing: ToolEntry[], toolCalls: ToolCallLike[], now = Date.now()): ToolEntry[] {
  const next = [...existing]
  for (const call of toolCalls) {
    if (!call.name || call.name === "task") continue
    const id = toolEntryId(call)
    const input = stringifyArgs(call.args)?.slice(0, 120)
    const duplicate = next.some((item) => item.id === id || (item.name === call.name && item.input === input))
    if (duplicate) continue
    next.push({
      id,
      toolCallId: call.id,
      name: call.name,
      input,
      status: "running",
      startedAt: now,
    })
  }
  return next
}

export function applyToolMessages(
  existingTools: ToolEntry[],
  existingArtifacts: AgentArtifact[],
  toolMessages: ToolMessageLike[],
): ToolResultUpdate {
  let tools = [...existingTools]
  let artifacts = [...existingArtifacts]

  for (const msg of toolMessages) {
    if (!msg.name) continue
    const toolCallId = msg.tool_call_id ?? msg.toolCallId
    const status = isToolError(msg.content) ? ("error" as const) : ("done" as const)
    let matched = false

    tools = tools.map((tool) => {
      const idMatch = toolCallId && (tool.toolCallId === toolCallId || tool.id === toolCallId)
      const fallbackMatch = !toolCallId && tool.name === msg.name && tool.status === "running"
      if (!matched && (idMatch || fallbackMatch)) {
        matched = true
        return { ...tool, status, output: msg.content }
      }
      return tool
    })

    if (!matched) {
      const id = toolCallId ?? `${msg.name}:${stableHash(msg.content ?? "")}`
      if (!tools.some((tool) => tool.id === id)) {
        tools.push({
          id,
          toolCallId,
          name: msg.name,
          status,
          output: msg.content,
          startedAt: Date.now(),
        })
      }
    }

    const artifactIdSeed = toolCallId ?? `${msg.name}:${stableHash(msg.content ?? "")}`
    artifacts = upsertArtifact(artifacts, extractArtifactFromToolMessage(msg.name, msg.content, artifactIdSeed))
  }

  return { tools, artifacts }
}
