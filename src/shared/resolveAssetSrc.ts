import { staticFile } from "remotion"

// Resolves an image/media src for use in <Img>/<Video>. Relative paths (assets in
// public/) must go through staticFile() so Remotion serves them correctly during
// render; absolute URLs (http, data, blob) and root-absolute paths pass through.
export function resolveAssetSrc(src: string): string {
  if (/^(https?:|data:|blob:|\/)/.test(src)) return src
  return staticFile(src)
}
