import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs"
import path from "path"
import { bundle } from "@remotion/bundler"
import { renderStill, selectComposition } from "@remotion/renderer"
import { enableTailwind } from "@remotion/tailwind-v4"
import { describe, test, expect, beforeAll } from "vitest"
import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"

const SNAPSHOTS_DIR = path.resolve(__dirname, "snapshots")
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1"

let bundleLocation: string

beforeAll(async () => {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true })
  bundleLocation = await bundle({
    entryPoint: path.resolve("./src/index.ts"),
    webpackOverride: enableTailwind,
  })
}, 300_000)

function loadFixture(name: string) {
  return JSON.parse(readFileSync(path.resolve(__dirname, "fixtures", name), "utf-8"))
}

async function compareOrUpdate(
  compositionId: string,
  frame: number,
  inputProps: Record<string, unknown>,
  snapshotName: string,
) {
  const tmpPath = path.join(SNAPSHOTS_DIR, `${snapshotName}.tmp.png`)
  const snapshotPath = path.join(SNAPSHOTS_DIR, `${snapshotName}.png`)

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  })

  await renderStill({
    serveUrl: bundleLocation,
    composition,
    frame,
    output: tmpPath,
    inputProps,
  })

  if (UPDATE || !existsSync(snapshotPath)) {
    const data = readFileSync(tmpPath)
    writeFileSync(snapshotPath, data)
    try {
      unlinkSync(tmpPath)
    } catch {
      /* ignore */
    }
    return
  }

  const actual = PNG.sync.read(readFileSync(tmpPath))
  const expected = PNG.sync.read(readFileSync(snapshotPath))
  const { width, height } = actual
  const diff = new PNG({ width, height })
  const numDiff = pixelmatch(actual.data, expected.data, diff.data, width, height, { threshold: 0.1 })
  const totalPixels = width * height
  const matchPercent = ((totalPixels - numDiff) / totalPixels) * 100

  try {
    unlinkSync(tmpPath)
  } catch {
    /* ignore */
  }

  expect(matchPercent).toBeGreaterThan(95)
}

describe("ClaudeCodeTutorial", () => {
  const config = loadFixture("tutorial-minimal.json")

  test("frame 0 matches snapshot", async () => {
    await compareOrUpdate("ClaudeCodeTutorial", 0, config, "tutorial-frame-0")
  }, 60_000)
})

describe("ProductShort", () => {
  const config = loadFixture("short-minimal.json")

  test("frame 0 matches snapshot", async () => {
    await compareOrUpdate("ProductShort", 0, config, "short-frame-0")
  }, 60_000)
})
