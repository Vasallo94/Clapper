import { Client } from "@langchain/langgraph-sdk"
import type {
  AudioChartData,
  ChatResponse,
  CheckpointData,
  ConfigListResponse,
  DirectionData,
  JobListResponse,
  RevisionPlanData,
  RenderJob,
  SoundChartData,
  TargetSelectionData,
  ValidationReportData,
  VariantPlanData,
} from "./types"

export const client = new Client({
  apiUrl: import.meta.env.VITE_LANGGRAPH_URL ?? "http://127.0.0.1:2024",
})

export const ASSISTANT_ID = "agent"

const RENDER_URL = import.meta.env.VITE_RENDER_URL ?? "http://127.0.0.1:3100"

export async function fetchJobStatus(jobId: string): Promise<RenderJob> {
  const res = await fetch(`${RENDER_URL}/api/render/${jobId}/status`)
  return res.json()
}

export async function fetchJobs(limit = 20, offset = 0): Promise<JobListResponse> {
  const res = await fetch(`${RENDER_URL}/api/render/jobs?limit=${limit}&offset=${offset}`)
  return res.json()
}

export async function fetchConfigs(): Promise<ConfigListResponse> {
  const res = await fetch(`${RENDER_URL}/api/configs`)
  return res.json()
}

export async function fetchLatestRender(configId: string): Promise<RenderJob | null> {
  const res = await fetch(`${RENDER_URL}/api/render/jobs?config_id=${encodeURIComponent(configId)}`)
  const body: JobListResponse = await res.json()
  const done = body.jobs.find((j) => j.status === "done")
  return done ?? null
}

export function getStreamUrl(jobId: string): string {
  return `${RENDER_URL}/api/render/${jobId}/stream`
}

export function getDownloadUrl(jobId: string): string {
  return `${RENDER_URL}/api/render/${jobId}/download`
}

export async function createThread(): Promise<string> {
  const thread = await client.threads.create()
  return thread.thread_id
}

interface TaskEntry {
  error?: string | null
  interrupts?: Array<{ value?: unknown }>
}

export async function extractResponse(threadId: string): Promise<ChatResponse> {
  const state = await client.threads.getState(threadId)
  const tasks = (state.tasks ?? []) as TaskEntry[]

  const errorTask = tasks.find((t) => t.error)
  if (errorTask) {
    const errorMsg = errorTask.error ?? "Unknown error"
    if (errorMsg.includes("Recursion limit") || errorMsg.includes("GRAPH_RECURSION_LIMIT")) {
      return {
        type: "message",
        content:
          "El pipeline ha alcanzado el limite de iteraciones intentando corregir errores de validacion. " +
          "Esto ocurre cuando el agente no puede generar un config valido automaticamente. " +
          "Intenta con una solicitud mas especifica o con menos escenas personalizadas.",
        thread_id: threadId,
      }
    }
    return { type: "message", content: `Error: ${errorMsg}`, thread_id: threadId }
  }

  const firstInterrupt = tasks.find((t) => t.interrupts && t.interrupts.length > 0)
  if (firstInterrupt) {
    const interruptValue = firstInterrupt.interrupts![0].value
    if (interruptValue && typeof interruptValue === "object") {
      return {
        type: "checkpoint",
        data: interruptValue as
          | CheckpointData
          | SoundChartData
          | AudioChartData
          | DirectionData
          | ValidationReportData
          | TargetSelectionData
          | RevisionPlanData
          | VariantPlanData,
        thread_id: threadId,
      }
    }
  }

  const messages = (state.values as Record<string, unknown>)?.messages as Array<{ content: string }> | undefined
  const lastMessage = messages?.[messages.length - 1]
  const content = typeof lastMessage?.content === "string" ? lastMessage.content : ""

  return { type: "message", content, thread_id: threadId }
}
