import { useCallback, useRef, useState } from "react"
import { client, ASSISTANT_ID, extractResponse } from "../api"
import { extractArtifactFromToolMessage } from "../lib/artifacts"
import type { AgentArtifact, AgentSummary, ChatResponse, ToolEntry } from "../types"

export interface StreamState {
  activeAgent: string | null
  tools: ToolEntry[]
  llmText: string
  artifacts: AgentArtifact[]
  completedAgents: AgentSummary[]
  error: string | null
}

const INITIAL: StreamState = {
  activeAgent: null,
  tools: [],
  llmText: "",
  artifacts: [],
  completedAgents: [],
  error: null,
}

const MAX_RETRIES = 3
const STREAM_TIMEOUT_MS = 30 * 60 * 1000

function extractSubagentName(toolCalls: Array<{ name?: string; args?: Record<string, unknown> }>): string | null {
  const taskCall = toolCalls.find((tc) => tc.name === "task")
  if (taskCall?.args?.subagent_type) return taskCall.args.subagent_type as string
  return null
}

function extractToolNames(toolCalls: Array<{ name?: string; args?: Record<string, unknown> }>): ToolEntry[] {
  return toolCalls
    .filter((tc) => tc.name && tc.name !== "task")
    .map((tc) => ({
      id: crypto.randomUUID(),
      name: tc.name!,
      input: tc.args ? JSON.stringify(tc.args).slice(0, 80) : undefined,
      status: "running" as const,
      startedAt: Date.now(),
    }))
}

function mergeStreamingText(previous: string, next: string): string {
  if (!previous) return next.slice(-4000)
  if (next.startsWith(previous)) return next.slice(-4000)
  if (previous.endsWith(next)) return previous
  return `${previous}${next}`.slice(-4000)
}

function artifactSignature(artifact: AgentArtifact): string {
  return JSON.stringify({
    kind: artifact.kind,
    content: artifact.content ?? null,
    data: artifact.data ?? null,
  })
}

function appendUniqueArtifacts(existing: AgentArtifact[], artifact: AgentArtifact | null): AgentArtifact[] {
  if (!artifact) return existing
  const nextSignature = artifactSignature(artifact)
  if (existing.some((item) => artifactSignature(item) === nextSignature)) return existing
  return [...existing, artifact]
}

function appendUniqueTools(existing: ToolEntry[], incoming: ToolEntry[]): ToolEntry[] {
  const next = [...existing]
  for (const tool of incoming) {
    const duplicateRunning = next.some(
      (item) => item.status === "running" && item.name === tool.name && item.input === tool.input,
    )
    if (!duplicateRunning) next.push(tool)
  }
  return next
}

function createSummary(
  name: string,
  state: Pick<StreamState, "tools" | "artifacts" | "llmText">,
  startedAt: number,
): AgentSummary {
  return {
    name,
    tools: [...state.tools],
    artifacts: [...state.artifacts],
    llmText: state.llmText.trim() || undefined,
    durationMs: Date.now() - startedAt,
    startedAt,
  }
}

function hasSummaryContent(summary: AgentSummary): boolean {
  return summary.tools.length > 0 || summary.artifacts.length > 0 || Boolean(summary.llmText?.trim())
}

export function useAgentStream(
  onAgentChange?: (name: string) => void,
  onAgentComplete?: (summary: AgentSummary) => void,
) {
  const [streamState, setStreamState] = useState<StreamState>(INITIAL)
  const [result, setResult] = useState<ChatResponse | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const agentStartRef = useRef<number>(0)
  const currentAgentRef = useRef<string | null>(null)
  const retryCountRef = useRef(0)
  const abortRef = useRef(false)
  const onAgentCompleteRef = useRef(onAgentComplete)
  onAgentCompleteRef.current = onAgentComplete

  const setAgent = useCallback(
    (name: string) => {
      if (name === currentAgentRef.current) return
      if (currentAgentRef.current) {
        setStreamState((prev) => {
          const summary = createSummary(currentAgentRef.current!, prev, agentStartRef.current)
          if (hasSummaryContent(summary)) onAgentCompleteRef.current?.(summary)
          return {
            ...prev,
            completedAgents: hasSummaryContent(summary) ? [...prev.completedAgents, summary] : prev.completedAgents,
            tools: [],
            artifacts: [],
            llmText: "",
            activeAgent: name,
          }
        })
      } else {
        setStreamState((prev) => ({ ...prev, activeAgent: name, tools: [], artifacts: [], llmText: "" }))
      }
      currentAgentRef.current = name
      agentStartRef.current = Date.now()
      onAgentChange?.(name)
    },
    [onAgentChange],
  )

  const finalizeAgent = useCallback(() => {
    if (!currentAgentRef.current) return
    setStreamState((prev) => {
      const summary = createSummary(currentAgentRef.current!, prev, agentStartRef.current)
      if (hasSummaryContent(summary)) onAgentCompleteRef.current?.(summary)
      return {
        ...prev,
        completedAgents: hasSummaryContent(summary) ? [...prev.completedAgents, summary] : prev.completedAgents,
        tools: [],
        artifacts: [],
        llmText: "",
        activeAgent: null,
      }
    })
    currentAgentRef.current = null
  }, [])

  const processStream = useCallback(
    async (threadId: string, payload: Record<string, unknown>) => {
      setIsStreaming(true)
      setResult(null)
      setStreamState((prev) => ({ ...INITIAL, completedAgents: prev.completedAgents }))
      abortRef.current = false
      retryCountRef.current = 0

      const attemptStream = async (): Promise<void> => {
        const timeoutId = setTimeout(() => {
          abortRef.current = true
        }, STREAM_TIMEOUT_MS)

        try {
          const stream = client.runs.stream(threadId, ASSISTANT_ID, payload as never)

          for await (const event of stream) {
            if (abortRef.current) {
              setStreamState((prev) => ({
                ...prev,
                error: "La conexion ha excedido el tiempo limite (30 min). Intenta de nuevo.",
              }))
              return
            }

            const ev = event as { event: string; data: unknown }

            if (ev.event === "updates" && ev.data && typeof ev.data === "object") {
              const data = ev.data as Record<string, unknown>

              if ("model" in data) {
                const modelUpdate = data.model as {
                  messages?: Array<{ tool_calls?: Array<{ name?: string; args?: Record<string, unknown> }> }>
                }
                const msgs = modelUpdate?.messages
                if (msgs?.length) {
                  const lastMsg = msgs[msgs.length - 1]
                  if (lastMsg.tool_calls?.length) {
                    const subagent = extractSubagentName(lastMsg.tool_calls)
                    if (subagent) {
                      setAgent(subagent)
                    } else {
                      const newTools = extractToolNames(lastMsg.tool_calls)
                      if (newTools.length) {
                        if (!currentAgentRef.current) setAgent("orchestrator")
                        setStreamState((prev) => ({ ...prev, tools: appendUniqueTools(prev.tools, newTools) }))
                      }
                    }
                  }
                }
              }

              if ("tools" in data) {
                const toolsUpdate = data.tools as { messages?: Array<{ content?: string; name?: string }> }
                if (toolsUpdate?.messages?.length) {
                  for (const toolMsg of toolsUpdate.messages) {
                    if (toolMsg.name) {
                      const hasError =
                        typeof toolMsg.content === "string" &&
                        (toolMsg.content.startsWith("Error") || toolMsg.content.startsWith("error"))
                      const newStatus = hasError ? ("error" as const) : ("done" as const)
                      const artifact = extractArtifactFromToolMessage(toolMsg.name, toolMsg.content)
                      setStreamState((prev) => ({
                        ...prev,
                        tools: prev.tools.map((t) =>
                          t.name === toolMsg.name && t.status === "running"
                            ? { ...t, status: newStatus, output: toolMsg.content }
                            : t,
                        ),
                        artifacts: appendUniqueArtifacts(prev.artifacts, artifact),
                      }))
                    }
                  }
                }
              }
            }

            if (ev.event === "messages/partial" && Array.isArray(ev.data) && ev.data.length > 0) {
              const chunk = ev.data[0] as { content?: string | Array<{ type?: string; text?: string }> }
              let text = ""
              if (typeof chunk.content === "string") {
                text = chunk.content
              } else if (Array.isArray(chunk.content)) {
                text = chunk.content
                  .filter((c) => c.type === "text" && c.text)
                  .map((c) => c.text)
                  .join("")
              }
              if (text) {
                setStreamState((prev) => ({ ...prev, llmText: mergeStreamingText(prev.llmText, text) }))
              }
            }

            if (ev.event === "error") {
              const errData = ev.data as { message?: string; error?: string }
              setStreamState((prev) => ({
                ...prev,
                error: errData.message || errData.error || "Unknown error",
              }))
            }
          }

          retryCountRef.current = 0
          finalizeAgent()
          const response = await extractResponse(threadId)
          setResult(response)
        } catch (err) {
          if (abortRef.current) {
            setStreamState((prev) => ({
              ...prev,
              error: "La conexion ha excedido el tiempo limite (30 min). Intenta de nuevo.",
            }))
            return
          }

          const errMsg = err instanceof Error ? err.message : String(err)
          const isNotFound = errMsg.includes("404") || errMsg.includes("not found")

          if (!isNotFound && retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1
            const delay = Math.pow(2, retryCountRef.current - 1) * 1000
            setStreamState((prev) => ({
              ...prev,
              error: `Reconectando (intento ${retryCountRef.current}/${MAX_RETRIES})...`,
            }))
            await new Promise((r) => setTimeout(r, delay))
            if (!abortRef.current) {
              setStreamState((prev) => ({ ...prev, error: null }))
              return attemptStream()
            }
          } else {
            const msg = isNotFound
              ? "Conversacion no encontrada. Pulsa '+ Nueva conversacion' para empezar."
              : `Error de conexion tras ${MAX_RETRIES} intentos: ${errMsg}`
            setStreamState((prev) => ({
              ...prev,
              error: msg,
            }))
          }
        } finally {
          clearTimeout(timeoutId)
        }
      }

      try {
        await attemptStream()
      } finally {
        setIsStreaming(false)
        currentAgentRef.current = null
      }
    },
    [setAgent, finalizeAgent],
  )

  const startStream = useCallback(
    (threadId: string, message: string) => {
      setStreamState(INITIAL)
      processStream(threadId, {
        input: { messages: [{ role: "user", content: message }] },
        streamMode: ["updates", "messages"],
      })
    },
    [processStream],
  )

  const resumeStream = useCallback(
    (threadId: string, decision: Record<string, unknown>) => {
      processStream(threadId, {
        command: { resume: decision },
        streamMode: ["updates", "messages"],
      })
    },
    [processStream],
  )

  const resetStream = useCallback(() => {
    setStreamState(INITIAL)
    setResult(null)
    currentAgentRef.current = null
    abortRef.current = true
  }, [])

  const clearError = useCallback(() => {
    setStreamState((prev) => ({ ...prev, error: null }))
  }, [])

  return { streamState, result, isStreaming, startStream, resumeStream, resetStream, clearError }
}
