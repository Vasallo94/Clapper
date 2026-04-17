import { readFileSync } from "fs"
import { TutorialConfigSchema } from "../src/compositions/ClaudeCodeTutorial/schema"
import { ProductShortConfigSchema } from "../src/compositions/ProductShort/schema"

const configPath = process.argv[2]
if (!configPath) {
  console.error("Usage: npx tsx scripts/validate-config.ts <path-to-config.json>")
  process.exit(2)
}

const raw = JSON.parse(readFileSync(configPath, "utf-8"))
const schema = raw.composition === "ProductShort" ? ProductShortConfigSchema : TutorialConfigSchema
const result = schema.safeParse(raw)

if (result.success) {
  console.log(JSON.stringify({ valid: true }))
} else {
  console.log(JSON.stringify({ valid: false, errors: result.error.issues }))
  process.exit(1)
}
