import { Client } from "@langchain/langgraph-sdk"
import type { ConfigListResponse, JobListResponse, RenderJob } from "./types"

export const client = new Client({
  apiUrl: import.meta.env.VITE_LANGGRAPH_URL ?? "http://127.0.0.1:2024",
})

export const ASSISTANT_ID = "claqueta"

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
