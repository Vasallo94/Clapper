import { describe, it, before, after } from "node:test"
import assert from "node:assert"
import { app } from "../src/server.js"
import type { Server } from "http"

let server: Server
const BASE = "http://localhost:3199"

before(() => {
  server = app.listen(3199)
})

after(() => {
  server.close()
})

describe("POST /api/validate", () => {
  it("returns valid:true for a correct config", async () => {
    const config = {
      id: "test-video",
      title: "Test",
      description: "A test video",
      fps: 30,
      width: 1280,
      height: 720,
      theme: "linea-directa",
      scenes: [{ type: "intro", title: "Hello", durationInSeconds: 3 }],
    }
    const res = await fetch(`${BASE}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert.strictEqual(body.valid, true)
  })

  it("returns valid:false for an invalid config", async () => {
    const res = await fetch(`${BASE}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bad: true }),
    })
    assert.strictEqual(res.status, 400)
    const body = await res.json()
    assert.strictEqual(body.valid, false)
    assert(Array.isArray(body.errors))
  })
})

describe("GET /api/render/:id/status", () => {
  it("returns 404 for unknown job", async () => {
    const res = await fetch(`${BASE}/api/render/nonexistent/status`)
    assert.strictEqual(res.status, 404)
  })
})

describe("GET /api/audio/library", () => {
  it("returns a list of tracks", async () => {
    const res = await fetch(`${BASE}/api/audio/library`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert(Array.isArray(body.tracks))
  })
})

describe("GET /api/render/jobs?config_id=", () => {
  it("returns empty array for unknown config_id", async () => {
    const res = await fetch(`${BASE}/api/render/jobs?config_id=nonexistent`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert(Array.isArray(body.jobs))
    assert.strictEqual(body.jobs.length, 0)
  })
})

describe("GET /api/configs", () => {
  it("returns selectable configs", async () => {
    const res = await fetch(`${BASE}/api/configs`)
    assert.strictEqual(res.status, 200)
    const body = await res.json()
    assert(Array.isArray(body.configs))
    assert(body.configs.some((config: { configPath?: string }) => config.configPath?.endsWith("config.json")))
  })
})
