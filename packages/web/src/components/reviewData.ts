export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export function labelize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export function getSceneTitle(scene: Record<string, unknown>): string {
  const props = asRecord(scene.props)
  const componentId = asString(scene.componentId)
  const customSummary = props ? getCustomSceneSummary(componentId, props) : ""
  return (
    asString(scene.title) ||
    asString(scene.headline) ||
    asString(scene.text) ||
    asString(props?.title) ||
    asString(props?.label) ||
    asString(props?.description) ||
    customSummary ||
    "-"
  )
}

function joinLabels(values: string[]): string {
  return values.filter(Boolean).slice(0, 3).join(" · ")
}

function findTitleInProps(props: Record<string, unknown>, depth = 0): string {
  if (depth > 3) return ""
  for (const key of ["title", "label", "heading", "name"]) {
    const val = asString(props[key])
    if (val.length >= 3 && val.length <= 100) return val
  }
  for (const value of Object.values(props)) {
    const record = asRecord(value)
    if (record) {
      const found = findTitleInProps(record, depth + 1)
      if (found) return found
    }
  }
  return ""
}

function getCustomSceneSummary(componentId: string, props: Record<string, unknown>): string {
  if (componentId === "split-screen" || componentId === "problem-solution" || componentId === "before-after") {
    const keyPairs: [string, string][] = [
      ["left", "right"],
      ["problem", "solution"],
      ["before", "after"],
    ]
    for (const [a, b] of keyPairs) {
      const aRec = asRecord(props[a])
      const bRec = asRecord(props[b])
      if (aRec || bRec) {
        return joinLabels([
          asString(aRec?.label) || asString(aRec?.title),
          asString(bRec?.label) || asString(bRec?.title),
        ])
      }
    }
  }

  if (componentId === "icon-grid" || componentId === "bullet-slide") {
    const items = asArray(props.items)
      .map((item) => {
        if (typeof item === "string") return item
        const record = asRecord(item)
        return (
          asString(record?.title) || asString(record?.label) || asString(record?.text) || asString(record?.description)
        )
      })
      .filter(Boolean)
    return joinLabels(items)
  }

  if (componentId === "flow-diagram") {
    const directTitle = asString(props.title)
    if (directTitle) return directTitle
    const steps = asArray(props.steps)
      .map((s) => {
        const rec = asRecord(s)
        return asString(rec?.label) || asString(rec?.title)
      })
      .filter(Boolean)
    if (steps.length) return joinLabels(steps)
  }

  return findTitleInProps(props)
}

export function getSceneScript(scene: Record<string, unknown>): string {
  const props = asRecord(scene.props)
  const voiceover = asRecord(scene.voiceover)
  return (
    asString(scene.narration) ||
    asString(scene.voiceover) ||
    asString(scene.script) ||
    asString(scene.voiceoverText) ||
    asString(voiceover?.text) ||
    asString(props?.narration) ||
    ""
  )
}

export function getVoiceoverText(value: unknown): string {
  if (typeof value === "string") return value
  const record = asRecord(value)
  return asString(record?.text)
}

export function getVoiceoverEntries(voiceover: Record<string, unknown> | null): Array<{ scene: string; text: string }> {
  const scenes = voiceover?.scenes
  if (!scenes) return []

  if (Array.isArray(scenes)) {
    return scenes
      .map((item, index) => {
        const record = asRecord(item)
        return {
          scene: String(record?.sceneIndex ?? index),
          text: getVoiceoverText(item),
        }
      })
      .filter((entry) => entry.text)
  }

  const record = asRecord(scenes)
  if (!record) return []

  return Object.entries(record)
    .map(([scene, value]) => ({ scene, text: getVoiceoverText(value) }))
    .filter((entry) => entry.text)
}

export function getSoundDesign(data: Record<string, unknown>): Record<string, unknown> | null {
  return asRecord(data.sound_design) ?? asRecord(data.soundDesign) ?? data
}

export function getMusicBed(soundDesign: Record<string, unknown> | null): Record<string, unknown> | null {
  return asRecord(soundDesign?.musicBed) ?? asRecord(soundDesign?.music_bed)
}

export function getSfxEntries(soundDesign: Record<string, unknown> | null): Array<Record<string, unknown>> {
  const sfx = soundDesign?.sfx ?? soundDesign?.sfx_entries
  return asArray(sfx)
    .map(asRecord)
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
}
