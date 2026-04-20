import React from "react"
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion"
import { useThemeTokens } from "../../../../shared/themes"
import type { Beat, Timing } from "../../../../utils/direction"
import { getBeatStartFrame, getSceneMotionDelayMs, msToFrames } from "../../../../utils/direction"

interface ContentBlock {
  type: "header" | "card-row" | "text" | "placeholder" | "button"
  text?: string
}

interface BrowserMockupProps {
  url: string
  title?: string
  variant?: "light" | "dark"
  content: ContentBlock[]
  timing?: Timing
  beats?: Beat[]
}

export const BrowserMockupScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as BrowserMockupProps
  const { url, title, variant = "light", content, timing, beats } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()
  const motionStartFrame = msToFrames(getSceneMotionDelayMs(timing), fps)
  const beatStartFrames = beats?.map((beat) => getBeatStartFrame(beat, fps))

  const isLight = variant === "light"
  const pageBg = isLight ? "#ffffff" : "#1e1e2e"
  const pageText = isLight ? "#333333" : "#cccccc"
  const blockBg = isLight ? "#f0f0f0" : "#2a2a3a"

  // Title
  const titleDelay = beatStartFrames?.[0] ?? motionStartFrame
  const titleSpring = spring({
    frame: Math.max(0, frame - titleDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })
  const titleOpacity = interpolate(titleSpring, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
  const titleY = interpolate(titleSpring, [0, 1], [20, 0])

  // Chrome
  const chromeDelay = (title ? beatStartFrames?.[1] : beatStartFrames?.[0]) ?? motionStartFrame + Math.ceil(fps * 0.2)
  const chromeOpacity = interpolate(frame, [chromeDelay, chromeDelay + Math.ceil(fps * 0.2)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // URL typewriter
  const urlDelay = chromeDelay + Math.ceil(fps * 0.15)
  const urlChars = Math.floor(
    interpolate(frame, [urlDelay, urlDelay + Math.ceil(fps * 0.4)], [0, url.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  )

  const beatOffset = title ? 2 : 1

  const renderBlock = (block: ContentBlock, i: number) => {
    const blockDelay = beatStartFrames?.[i + beatOffset] ?? urlDelay + Math.ceil(fps * 0.3) + i * Math.ceil(fps * 0.15)
    const blockOpacity = interpolate(frame, [blockDelay, blockDelay + Math.ceil(fps * 0.15)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })

    const base: React.CSSProperties = { opacity: blockOpacity, borderRadius: 4 }

    switch (block.type) {
      case "header":
        return (
          <div
            key={i}
            style={{
              ...base,
              background: blockBg,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 600,
              color: pageText,
            }}
          >
            {block.text ?? "Header"}
          </div>
        )
      case "card-row":
        return (
          <div key={i} style={{ ...base, display: "flex", gap: 10 }}>
            {[0, 1, 2].map((j) => (
              <div key={j} style={{ flex: 1, background: blockBg, borderRadius: 4, height: 48 }} />
            ))}
          </div>
        )
      case "text":
        return (
          <div key={i} style={{ ...base, fontSize: 13, color: pageText, lineHeight: 1.6, padding: "4px 0" }}>
            {block.text ?? "Text content placeholder"}
          </div>
        )
      case "placeholder":
        return <div key={i} style={{ ...base, background: blockBg, height: 36 }} />
      case "button":
        return (
          <div key={i} style={{ ...base }}>
            <div
              style={{
                display: "inline-block",
                background: tokens.primary,
                color: tokens.primaryForeground,
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 20px",
                borderRadius: 4,
              }}
            >
              {block.text ?? "Button"}
            </div>
          </div>
        )
      default:
        return <div key={i} style={{ ...base, background: blockBg, height: 30 }} />
    }
  }

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 80px",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: tokens.foreground,
            fontFamily: tokens.fontFamily,
            marginBottom: 20,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 640,
          borderRadius: "10px 10px 8px 8px",
          overflow: "hidden",
          boxShadow: tokens.card.shadow,
          opacity: chromeOpacity,
        }}
      >
        {/* Browser chrome */}
        <div
          style={{
            background: tokens.terminal.titleBar,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: tokens.terminal.dots[0] }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: tokens.terminal.dots[1] }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: tokens.terminal.dots[2] }} />
          </div>
          <div
            style={{
              flex: 1,
              background: tokens.terminal.bg,
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 12,
              color: "#888",
              fontFamily: tokens.monoFontFamily,
            }}
          >
            {url.slice(0, urlChars)}
            {urlChars < url.length && <span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>|</span>}
          </div>
        </div>

        {/* Page content */}
        <div
          style={{
            background: pageBg,
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minHeight: 180,
          }}
        >
          {content.map(renderBlock)}
        </div>
      </div>
    </AbsoluteFill>
  )
}
