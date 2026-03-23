// src/compositions/ClaudeCodeTutorial/calculateMetadata.ts
import { createCalculateMetadata } from "../../utils/calculateMetadata"
import { TutorialConfig } from "./schema"

export const calculateMetadata = createCalculateMetadata<TutorialConfig>()
