import { describe, expect, it } from "vitest"
import { appendToolCalls, applyToolMessages, extractSubagentName, mergeStreamingText } from "./streamEvents"

describe("stream event helpers", () => {
  it("deduplicates tool calls by tool_call_id", () => {
    const call = { id: "call-1", name: "validate_config", args: { config: "{}" } }
    const once = appendToolCalls([], [call], 100)
    const twice = appendToolCalls(once, [call], 101)

    expect(twice).toHaveLength(1)
    expect(twice[0].id).toBe("call-1")
  })

  it("applies repeated tool messages without duplicating artifacts", () => {
    const tools = appendToolCalls([], [{ id: "call-1", name: "validate_config", args: {} }], 100)
    const messages = [{ name: "validate_config", tool_call_id: "call-1", content: '{"errors":[],"warnings":[]}' }]

    const once = applyToolMessages(tools, [], messages)
    const twice = applyToolMessages(once.tools, once.artifacts, messages)

    expect(twice.tools).toHaveLength(1)
    expect(twice.tools[0].status).toBe("done")
    expect(twice.artifacts).toHaveLength(1)
  })

  it("extracts subagent task type", () => {
    expect(extractSubagentName([{ name: "task", args: { subagent_type: "director" } }])).toBe("director")
  })

  it("merges cumulative and incremental streaming text", () => {
    expect(mergeStreamingText("hola", "hola mundo")).toBe("hola mundo")
    expect(mergeStreamingText("hola", " mundo")).toBe("hola mundo")
    expect(mergeStreamingText("hola", "hola")).toBe("hola")
  })
})
