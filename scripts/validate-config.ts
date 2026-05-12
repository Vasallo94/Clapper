import { readFileSync } from "fs"
import { TutorialConfigSchema } from "../src/compositions/ClaudeCodeTutorial/schema"
import { ProductShortConfigSchema } from "../src/compositions/ProductShort/schema"

const configPath = process.argv[2]
if (!configPath) {
  console.error("Usage: npx tsx scripts/validate-config.ts <path-to-config.json>")
  process.exit(2)
}

let raw: unknown
try {
  raw = JSON.parse(readFileSync(configPath, "utf-8"))
} catch (e) {
  console.log(JSON.stringify({ valid: false, errors: [{ message: `Invalid JSON: ${(e as Error).message}` }] }))
  process.exit(1)
}

const config = raw as Record<string, unknown>
const KNOWN_COMPOSITIONS = new Set(["ClaudeCodeTutorial", "ProductShort"])
if (config.composition !== undefined && !KNOWN_COMPOSITIONS.has(config.composition as string)) {
  console.log(JSON.stringify({ valid: false, errors: [{ message: `Unknown composition: "${config.composition}"` }] }))
  process.exit(1)
}

const schema = config.composition === "ProductShort" ? ProductShortConfigSchema : TutorialConfigSchema
const result = schema.safeParse(raw)

if (result.success) {
  console.log(JSON.stringify({ valid: true }))
} else {
  console.log(JSON.stringify({ valid: false, errors: result.error.issues }))
  process.exit(1)
}
