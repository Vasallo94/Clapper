import { Client } from "@langchain/langgraph-sdk"
import type { ChatResponse, CheckpointData, DirectionData, RenderJob, JobListResponse, SoundChartData } from "./types"

export const client = new Client({
  apiUrl: import.meta.env.VITE_LANGGRAPH_URL ?? "http://localhost:2024",
})

export const ASSISTANT_ID = "agent"

const RENDER_URL = import.meta.env.VITE_RENDER_URL ?? "http://localhost:3100"

export async function fetchJobStatus(jobId: string): Promise<RenderJob> {
  const res = await fetch(`${RENDER_URL}/api/render/${jobId}/status`)
  return res.json()
}

export async function fetchJobs(limit = 20, offset = 0): Promise<JobListResponse> {
  const res = await fetch(`${RENDER_URL}/api/render/jobs?limit=${limit}&offset=${offset}`)
  return res.json()
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
    return { type: "message", content: `Error: ${errorTask.error}`, thread_id: threadId }
  }

  const firstInterrupt = tasks.find((t) => t.interrupts && t.interrupts.length > 0)
  if (firstInterrupt) {
    const interruptValue = firstInterrupt.interrupts![0].value
    if (interruptValue && typeof interruptValue === "object") {
      return {
        type: "checkpoint",
        data: interruptValue as CheckpointData | SoundChartData | DirectionData,
        thread_id: threadId,
      }
    }
  }

  const messages = (state.values as Record<string, unknown>)?.messages as Array<{ content: string }> | undefined
  const lastMessage = messages?.[messages.length - 1]
  const content = typeof lastMessage?.content === "string" ? lastMessage.content : ""

  return { type: "message", content, thread_id: threadId }
}
