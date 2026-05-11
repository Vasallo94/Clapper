import { describe, expect, it } from "vitest"
import { appendTargetMetadata, parseTargetMetadata, stripTargetMetadata } from "./targetMetadata"

describe("target metadata helpers", () => {
  it("appends, parses, and strips active target metadata", () => {
    const target = {
      configPath: "content/tutorials/demo/config.json",
      configId: "demo",
      jobId: "job-1",
      composition: "ClaudeCodeTutorial",
      title: "Demo",
    }

    const encoded = appendTargetMetadata("mejora este video", target)

    expect(parseTargetMetadata(encoded)).toEqual(target)
    expect(stripTargetMetadata(encoded)).toBe("mejora este video")
  })

  it("returns original message when no target is provided", () => {
    expect(appendTargetMetadata("hola", null)).toBe("hola")
    expect(parseTargetMetadata("hola")).toBeNull()
    expect(stripTargetMetadata("hola")).toBe("hola")
  })
})
