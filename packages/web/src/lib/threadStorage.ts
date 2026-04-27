const THREADS_KEY = "remotion-threads"
const CURRENT_KEY = "remotion-current-thread"

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
