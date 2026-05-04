import React from "react"
import { continueRender, delayRender, staticFile } from "remotion"
import { TutorialConfig } from "./schema"
import { getTheme } from "../../shared/themes"
import { IntroScene } from "./scenes/IntroScene"
import { TerminalScene } from "./scenes/TerminalScene"
import { CalloutScene } from "./scenes/CalloutScene"
import { OutroScene } from "./scenes/OutroScene"
import { CustomScene } from "./scenes/CustomScene"
import { HeroScene } from "../ProductShort/scenes/HeroScene"
import { BenefitsScene } from "../ProductShort/scenes/BenefitsScene"
import { PricingScene } from "../ProductShort/scenes/PricingScene"
import { CtaScene } from "../ProductShort/scenes/CtaScene"
import { KaraokeSubtitles, type WordTimestamp } from "../../shared/components/KaraokeSubtitles"
import { LogoWatermark } from "../../shared/components/LogoWatermark"
import { CompositionShell } from "../../shared/CompositionShell"

function useTimestamps(configId: string, sceneCount: number, enabled: boolean): (WordTimestamp[] | null)[] {
  const [timestamps, setTimestamps] = React.useState<(WordTimestamp[] | null)[]>(() =>
    Array.from({ length: sceneCount }, () => null),
  )
  const [handle] = React.useState(() => (enabled ? delayRender("Loading subtitle timestamps") : null))

  React.useEffect(() => {
    if (!enabled) return

    const loadAll = async () => {
      const results: (WordTimestamp[] | null)[] = []
      for (let i = 0; i < sceneCount; i++) {
        try {
          const url = staticFile(`voiceover/${configId}/${i}.timestamps.json`)
          const res = await fetch(url)
          if (res.ok) {
            results.push(await res.json())
          } else {
            results.push(null)
          }
        } catch {
          results.push(null)
        }
      }
      setTimestamps(results)
      if (handle !== null) continueRender(handle)
    }

    loadAll()
  }, [configId, sceneCount, enabled, handle])

  return timestamps
}

export const ClaudeCodeTutorial: React.FC<TutorialConfig> = (config) => {
  const theme = getTheme(config.theme ?? "default")
  const subtitlesEnabled = config.subtitles?.enabled !== false && Boolean(config.voiceover?.enabled)
  const sceneTimestamps = useTimestamps(config.id, config.scenes.length, subtitlesEnabled)
  const showLogoWatermark = !theme.mascot.show

  return (
    <CompositionShell
      config={config}
      theme={config.theme ?? "default"}
      renderScene={(scene) => (
        <>
          {scene.type === "intro" && <IntroScene {...scene} />}
          {scene.type === "terminal" && <TerminalScene {...scene} />}
          {scene.type === "callout" && <CalloutScene {...scene} />}
          {scene.type === "outro" && <OutroScene {...scene} />}
          {scene.type === "custom" && <CustomScene {...scene} />}
          {scene.type === "hero" && <HeroScene {...scene} />}
          {scene.type === "benefits" && <BenefitsScene {...scene} />}
          {scene.type === "pricing" && <PricingScene {...scene} />}
          {scene.type === "cta" && <CtaScene {...scene} />}
        </>
      )}
      renderOverlay={(scene, info, i) => (
        <>
          {subtitlesEnabled && sceneTimestamps[i] && (
            <KaraokeSubtitles
              timestamps={sceneTimestamps[i]!}
              audioDelayFrames={info.audioDelayFrames}
              position={config.subtitles?.position ?? "bottom"}
              fontSize={config.subtitles?.fontSize ?? 32}
            />
          )}
          {showLogoWatermark && scene.type !== "intro" && <LogoWatermark />}
        </>
      )}
    />
  )
}
