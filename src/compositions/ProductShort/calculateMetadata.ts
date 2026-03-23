// src/compositions/ProductShort/calculateMetadata.ts
import { createCalculateMetadata } from "../../utils/calculateMetadata"
import { ProductShortConfig } from "./schema"

export const calculateMetadata = createCalculateMetadata<ProductShortConfig>()
