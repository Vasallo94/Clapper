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
  return (
    asString(scene.title) ||
    asString(scene.headline) ||
    asString(scene.text) ||
    asString(props?.title) ||
    asString(props?.label) ||
    asString(props?.description) ||
    "-"
  )
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
