import express from "express"
import cors from "cors"
import { randomUUID } from "crypto"
import { spawn } from "child_process"
import { mkdirSync, writeFileSync, readdirSync } from "fs"
import path from "path"

const app = express()
app.use(cors())
app.use(express.json({ limit: "10mb" }))

// Resolve project root relative to this file (packages/render-service/src/server.ts -> root)
const ROOT_DIR = process.env.ROOT_DIR || path.resolve(__dirname, "../../..")
const JOBS_DIR = path.resolve(ROOT_DIR, "packages/render-service/jobs")

interface RenderJob {
  status: "validating" | "rendering" | "done" | "error"
  progress: number
  output?: string
  error?: string
}

const jobs = new Map<string, RenderJob>()

// POST /api/validate — validate config against Zod schemas
app.post("/api/validate", (req, res) => {
  const jobDir = path.join(JOBS_DIR, `validate-${randomUUID()}`)
  mkdirSync(jobDir, { recursive: true })
  const configPath = path.join(jobDir, "config.json")
  writeFileSync(configPath, JSON.stringify(req.body, null, 2))

  const child = spawn("npx", ["tsx", "scripts/validate-config.ts", configPath], {
    cwd: ROOT_DIR,
    shell: true,
  })

  let stdout = ""
  let stderr = ""
  child.stdout.on("data", (d) => (stdout += d.toString()))
  child.stderr.on("data", (d) => (stderr += d.toString()))

  child.on("close", (code) => {
    try {
      // Extract JSON from stdout — npx on Windows may prepend extra output
      const jsonMatch = stdout.match(/(\{[\s\S]*\})\s*$/)
      const result = JSON.parse(jsonMatch ? jsonMatch[1] : stdout)
      res.status(code === 0 ? 200 : 400).json(result)
    } catch {
      res.status(500).json({ error: "Validation script error", details: stderr || stdout })
    }
  })
})

// POST /api/render — submit render job
app.post("/api/render", (req, res) => {
  const jobId = randomUUID()
  const jobDir = path.join(JOBS_DIR, jobId)
  mkdirSync(jobDir, { recursive: true })

  const configPath = path.join(jobDir, "config.json")
  writeFileSync(configPath, JSON.stringify(req.body, null, 2))

  jobs.set(jobId, { status: "validating", progress: 0 })

  // First validate
  const validateChild = spawn("npx", ["tsx", "scripts/validate-config.ts", configPath], {
    cwd: ROOT_DIR,
    shell: true,
  })

  let valOut = ""
  validateChild.stdout.on("data", (d) => (valOut += d.toString()))

  validateChild.on("close", (valCode) => {
    if (valCode !== 0) {
      const job = jobs.get(jobId)!
      job.status = "error"
      try {
        const jsonMatch = valOut.match(/(\{[\s\S]*\})\s*$/)
        job.error = JSON.stringify(JSON.parse(jsonMatch ? jsonMatch[1] : valOut).errors)
      } catch {
        job.error = valOut || "Config validation failed"
      }
      return
    }

    // Validation passed — start render
    const job = jobs.get(jobId)!
    job.status = "rendering"

    const renderArgs = ["tsx", "scripts/render.ts", configPath]
    if (req.body._skipAudioGeneration) renderArgs.push("--skip-audio-generation")

    const renderChild = spawn("npx", renderArgs, {
      cwd: ROOT_DIR,
      shell: true,
    })

    renderChild.stdout.on("data", (data) => {
      const match = data.toString().match(/(\d+)%/)
      if (match) job.progress = parseInt(match[1])
    })

    renderChild.stderr.on("data", (data) => {
      const match = data.toString().match(/(\d+)%/)
      if (match) job.progress = parseInt(match[1])
    })

    renderChild.on("close", (code) => {
      if (code === 0) {
        job.status = "done"
        job.progress = 100
        job.output = path.join(jobDir, "output.mp4")
      } else {
        job.status = "error"
        job.error = `Render exited with code ${code}`
      }
    })
  })

  // Return immediately with job ID
  res.json({ jobId })
})

// GET /api/render/:id/status — check render progress
app.get("/api/render/:id/status", (req, res) => {
  const job = jobs.get(req.params.id)
  if (!job) {
    res.status(404).json({ error: "Job not found" })
    return
  }
  res.json({ jobId: req.params.id, ...job })
})

// GET /api/audio/library — list available music tracks
app.get("/api/audio/library", (_req, res) => {
  const libraryDir = path.join(ROOT_DIR, "public/audio/library")
  try {
    const files = readdirSync(libraryDir)
      .filter((f: string) => f.endsWith(".mp3"))
      .map((f: string) => f.replace(".mp3", ""))
    res.json({ tracks: files })
  } catch {
    res.json({ tracks: [] })
  }
})

const PORT = parseInt(process.env.PORT || "3100")
app.listen(PORT, () => {
  console.log(`Render service listening on :${PORT}`)
})

export { app }
