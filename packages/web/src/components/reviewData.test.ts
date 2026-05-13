import { describe, expect, it } from "vitest"
import { getSceneTitle } from "./reviewData"

describe("getSceneTitle", () => {
  it("returns direct title field", () => {
    expect(getSceneTitle({ title: "Intro Scene" })).toBe("Intro Scene")
  })

  it("returns props.title when top-level title missing", () => {
    expect(getSceneTitle({ props: { title: "From Props" } })).toBe("From Props")
  })

  it("returns split-screen summary from panel labels", () => {
    expect(
      getSceneTitle({
        componentId: "split-screen",
        props: { left: { label: "Before" }, right: { label: "After" } },
      }),
    ).toBe("Before · After")
  })

  it("returns problem-solution summary", () => {
    expect(
      getSceneTitle({
        componentId: "problem-solution",
        props: { problem: { title: "Bad UX" }, solution: { title: "Good UX" } },
      }),
    ).toBe("Bad UX · Good UX")
  })

  it("returns before-after summary", () => {
    expect(
      getSceneTitle({
        componentId: "before-after",
        props: { before: { title: "Old Way" }, after: { title: "New Way" } },
      }),
    ).toBe("Old Way · New Way")
  })

  it("returns flow-diagram title", () => {
    expect(
      getSceneTitle({
        componentId: "flow-diagram",
        props: { title: "Data Pipeline" },
      }),
    ).toBe("Data Pipeline")
  })

  it("returns flow-diagram step labels when no title", () => {
    expect(
      getSceneTitle({
        componentId: "flow-diagram",
        props: { steps: [{ label: "Input" }, { label: "Process" }, { label: "Output" }] },
      }),
    ).toBe("Input · Process · Output")
  })

  it("falls back to generic title search in unknown components", () => {
    expect(
      getSceneTitle({
        componentId: "timeline",
        props: { header: { title: "Project Timeline" } },
      }),
    ).toBe("Project Timeline")
  })

  it("extracts title from array of objects in generic fallback", () => {
    expect(
      getSceneTitle({
        componentId: "unknown-list",
        props: { items: [{ title: "First Item" }, { title: "Second" }] },
      }),
    ).toBe("First Item")
  })

  it("returns dash when no title can be extracted", () => {
    expect(getSceneTitle({ componentId: "empty", props: {} })).toBe("-")
  })

  it("ignores very short or very long strings in generic fallback", () => {
    expect(
      getSceneTitle({
        componentId: "unknown",
        props: { x: "ab", y: "A".repeat(101), nested: { title: "Valid Title" } },
      }),
    ).toBe("Valid Title")
  })
})
