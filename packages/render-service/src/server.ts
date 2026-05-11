import express from "express"
import cors from "cors"
import { randomUUID } from "crypto"
import { spawn } from "child_process"
import { mkdirSync, writeFileSync, readdirSync, statSync, readFileSync } from "fs"
import { pathToFileURL } from "url"
import path from "path"
import { insertJob, updateJob, getJob, getJobByConfigId, listJobs } from "./db"

const app = express()
app.use(cors())
app.use(express.json({ limit: "10mb" }))

const ROOT_DIR = process.env.ROOT_DIR || path.resolve(__dirname, "../../..")
const JOBS_DIR = path.resolve(ROOT_DIR, ".generated/renders")
mkdirSync(JOBS_DIR, { recursive: true })

function summarizeConfig(configPath: string) {
  const config = JSON.parse(readFileSync(configPath, "utf-8"))
  const scenes = Array.isArray(config.scenes) ? config.scenes : []
  return {
    configPath: path.relative(ROOT_DIR, configPath),
    configId: config.id || path.basename(path.dirname(configPath)),
    composition: config.composition || "ClaudeCodeTutorial",
    title: config.title || config.headline || config.product || path.basename(path.dirname(configPath)),
    sceneCount: scenes.length,
    durationSeconds: scenes.reduce(
      (sum: number, scene: { durationInSeconds?: number }) => sum + Number(scene.durationInSeconds || 0),
      0,
    ),
  }
}

function listConfigFiles(): string[] {
  const roots = ["content/tutorials", "content/shorts", "content/presentations"]
  const files: string[] = []
  for (const root of roots) {
    const dir = path.join(ROOT_DIR, root)
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const configPath = path.join(dir, entry.name, "config.json")
        try {
          statSync(configPath)
          files.push(configPath)
        } catch {
          // Directory without config.
        }
      }
    } catch {
      // Optional content root.
    }
  }

  try {
    for (const entry of readdirSync(JOBS_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const configPath = path.join(JOBS_DIR, entry.name, "config.json")
      try {
        statSync(configPath)
        files.push(configPath)
      } catch {
        // Render job without config.
      }
    }
  } catch {
    // Generated renders may not exist yet.
  }

  return [...new Set(files)]
}

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
      // npx on Windows may prepend loader output before the JSON
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

  insertJob({
    id: jobId,
    config_id: req.body.id,
    title: req.body.title || req.body.headline || req.body.product,
    composition: req.body.composition || "ClaudeCodeTutorial",
    thread_id: req.body._threadId,
  })

  // First validate
  const validateChild = spawn("npx", ["tsx", "scripts/validate-config.ts", configPath], {
    cwd: ROOT_DIR,
    shell: true,
  })

  let valOut = ""
  let valErr = ""
  validateChild.stdout.on("data", (d) => (valOut += d.toString()))
  validateChild.stderr.on("data", (d) => (valErr += d.toString()))

  validateChild.on("close", (valCode) => {
    let validationPassed = valCode === 0
    try {
      const jsonMatch = valOut.match(/(\{[\s\S]*\})\s*$/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[1])
        validationPassed = result.valid === true || (Array.isArray(result.errors) && result.errors.length === 0)
        if (!validationPassed) {
          updateJob(jobId, {
            status: "error",
            error: JSON.stringify(result.errors || result),
            completed_at: new Date().toISOString(),
          })
          return
        }
      }
    } catch {
      if (valCode !== 0) {
        updateJob(jobId, {
          status: "error",
          error: valErr || valOut || "Config validation failed",
          completed_at: new Date().toISOString(),
        })
        return
      }
    }

    updateJob(jobId, { status: "rendering" })

    const renderArgs = ["tsx", "scripts/render.ts", configPath]
    if (req.body._skipAudioGeneration) renderArgs.push("--skip-audio-generation")

    const renderChild = spawn("npx", renderArgs, {
      cwd: ROOT_DIR,
      shell: true,
    })

    let renderStderr = ""
    const MAX_STDERR = 4000

    renderChild.stdout.on("data", (data) => {
      const match = data.toString().match(/(\d+)%/)
      if (match) updateJob(jobId, { progress: parseInt(match[1]) })
    })

    renderChild.stderr.on("data", (data) => {
      const chunk = data.toString()
      const match = chunk.match(/(\d+)%/)
      if (match) updateJob(jobId, { progress: parseInt(match[1]) })
      if (renderStderr.length < MAX_STDERR) {
        renderStderr += chunk.slice(0, MAX_STDERR - renderStderr.length)
      }
    })

    renderChild.on("close", (code) => {
      if (code === 0) {
        const outputPath = path.join(jobDir, "output.mp4")
        updateJob(jobId, {
          status: "done",
          progress: 100,
          output_path: outputPath,
          file_size: statSync(outputPath).size,
          completed_at: new Date().toISOString(),
        })
      } else {
        const detail = renderStderr.trim()
        updateJob(jobId, {
          status: "error",
          error: detail || `Render exited with code ${code}`,
          completed_at: new Date().toISOString(),
        })
      }
    })
  })

  // Return immediately with job ID
  res.json({ jobId })
})

// GET /api/render/jobs — list all jobs (must be before :id routes)
app.get("/api/render/jobs", (req, res) => {
  const configId = req.query.config_id as string | undefined
  if (configId) {
    const job = getJobByConfigId(configId)
    res.json({ jobs: job ? [job] : [], total: job ? 1 : 0, limit: 1, offset: 0 })
    return
  }
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0
  const result = listJobs(limit, offset)
  res.json({ ...result, limit, offset })
})

// GET /api/configs — list selectable video configs
app.get("/api/configs", (_req, res) => {
  const configs = listConfigFiles().map((configPath) => {
    try {
      return summarizeConfig(configPath)
    } catch (error) {
      return {
        configPath: path.relative(ROOT_DIR, configPath),
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
  res.json({ configs })
})

// GET /api/render/:id/status — check render progress
app.get("/api/render/:id/status", (req, res) => {
  const job = getJob(req.params.id)
  if (!job) {
    res.status(404).json({ error: "Job not found" })
    return
  }
  res.json(job)
})

// GET /api/render/:id/stream — serve video for in-browser playback (supports Range)
app.get("/api/render/:id/stream", (req, res) => {
  const job = getJob(req.params.id)
  if (!job || job.status !== "done" || !job.output_path) {
    res.status(404).json({ error: "Video not available" })
    return
  }
  try {
    statSync(job.output_path)
  } catch {
    res.status(410).json({ error: "Video file deleted" })
    return
  }
  res.sendFile(job.output_path, { headers: { "Content-Type": "video/mp4" } })
})

// GET /api/render/:id/download — download rendered video
app.get("/api/render/:id/download", (req, res) => {
  const job = getJob(req.params.id)
  if (!job || job.status !== "done" || !job.output_path) {
    res.status(404).json({ error: "Video not available" })
    return
  }
  try {
    statSync(job.output_path)
  } catch {
    res.status(410).json({ error: "Video file deleted" })
    return
  }
  res.download(job.output_path, `${job.config_id || job.id}.mp4`)
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
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  app.listen(PORT, () => {
    console.log(`Render service listening on :${PORT}`)
  })
}

export { app }
