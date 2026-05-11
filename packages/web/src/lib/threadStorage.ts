import type { ActiveVideoTarget, StoredVideoArtifact } from "../types"

const THREADS_KEY = "remotion-threads"
const CURRENT_KEY = "remotion-current-thread"
const ARTIFACTS_KEY = "remotion-video-artifacts"
const ACTIVE_TARGET_KEY = "remotion-active-video-target"

export interface StoredThread {
  threadId: string
  title: string
  createdAt: string
  lastActiveAt: string
}

export function getThreads(): StoredThread[] {
  try {
    return JSON.parse(localStorage.getItem(THREADS_KEY) || "[]")
  } catch {
    return []
  }
}

export function saveThread(thread: StoredThread): void {
  const threads = getThreads().filter((t) => t.threadId !== thread.threadId)
  threads.unshift(thread)
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads.slice(0, 50)))
}

export function removeThread(threadId: string): void {
  const threads = getThreads().filter((t) => t.threadId !== threadId)
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads))
  if (getCurrentThreadId() === threadId) setCurrentThreadId(null)
}

export function getCurrentThreadId(): string | null {
  return localStorage.getItem(CURRENT_KEY)
}

export function setCurrentThreadId(threadId: string | null): void {
  if (threadId) localStorage.setItem(CURRENT_KEY, threadId)
  else localStorage.removeItem(CURRENT_KEY)
}

export function getVideoArtifacts(): StoredVideoArtifact[] {
  try {
    return JSON.parse(localStorage.getItem(ARTIFACTS_KEY) || "[]")
  } catch {
    return []
  }
}

export function saveVideoArtifact(artifact: StoredVideoArtifact): void {
  const artifacts = getVideoArtifacts().filter((item) => item.id !== artifact.id)
  artifacts.unshift(artifact)
  localStorage.setItem(ARTIFACTS_KEY, JSON.stringify(artifacts.slice(0, 100)))
}

export function getActiveVideoTarget(): ActiveVideoTarget | null {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_TARGET_KEY) || "null")
  } catch {
    return null
  }
}

export function setActiveVideoTarget(target: ActiveVideoTarget | null): void {
  if (target) localStorage.setItem(ACTIVE_TARGET_KEY, JSON.stringify(target))
  else localStorage.removeItem(ACTIVE_TARGET_KEY)
}
