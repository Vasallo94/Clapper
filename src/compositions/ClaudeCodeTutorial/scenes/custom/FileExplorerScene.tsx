// src/compositions/ClaudeCodeTutorial/scenes/custom/FileExplorerScene.tsx
import React from "react"
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import { useThemeTokens } from "../../themes"
import { FolderIcon, MarkdownIcon, ChevronIcon } from "./svg-icons"

interface FileEntry {
  name: string
  type: "file" | "folder"
  indent?: number
  isNew?: boolean
}

interface FileExplorerProps {
  rootPath: string
  files: FileEntry[]
  expandFile: string
  fileContent: string
  calloutText?: string
}

export const FileExplorerScene: React.FC<Record<string, unknown>> = (rawProps) => {
  const props = rawProps as unknown as FileExplorerProps
  const { rootPath, files = [], expandFile, fileContent = "", calloutText } = props
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tokens = useThemeTokens()

  const fileStagger = Math.ceil(fps * 0.5)
  const expandStart = files.length * fileStagger + Math.ceil(fps * 1)
  const contentRevealDuration = Math.ceil(fps * 4)

  // Parse frontmatter vs body from fileContent
  const fmMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  const frontmatter = fmMatch ? fmMatch[1] : ""
  const body = fmMatch ? fmMatch[2].trim() : fileContent

  // Callout animation
  const calloutDelay = expandStart + contentRevealDuration + Math.ceil(fps * 0.3)
  const calloutSpring = spring({
    frame: Math.max(0, frame - calloutDelay),
    fps,
    config: { damping: 20, stiffness: 180 },
    durationInFrames: Math.ceil(fps * 0.5),
  })

  return (
    <AbsoluteFill
      style={{
        background: tokens.backgroundGradient,
        display: "flex",
        flexDirection: "row",
        padding: 48,
        gap: 24,
      }}
    >
      {/* File tree panel */}
      <div
        style={{
          width: 360,
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          borderRadius: 10,
          padding: "16px 0",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Root path header */}
        <div
          style={{
            fontFamily: tokens.monoFontFamily,
            fontSize: 11,
            color: tokens.foregroundMid,
            padding: "0 16px 12px",
            borderBottom: `1px solid ${tokens.card.border}`,
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ChevronIcon color={tokens.foregroundMid} open />
          {rootPath}
        </div>

        {/* File entries */}
        {files.map((file, i) => {
          const delay = i * fileStagger
          const s = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 200 },
            durationInFrames: Math.ceil(fps * 0.3),
          })
          const opacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })
          const x = interpolate(s, [0, 1], [-20, 0])

          const isExpanded = file.name === expandFile
          const indent = (file.indent ?? 0) * 16 + 16

          const Icon = file.type === "folder" ? FolderIcon : MarkdownIcon
          const nameColor = file.isNew ? tokens.primary : tokens.foreground
          const bgHighlight =
            isExpanded && frame >= expandStart ? `${tokens.primary}15` : "transparent"

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 16px",
                paddingLeft: indent,
                fontFamily: tokens.monoFontFamily,
                fontSize: 13,
                color: nameColor,
                opacity,
                transform: `translateX(${x}px)`,
                background: bgHighlight,
              }}
            >
              <Icon
                size={16}
                color={
                  file.type === "folder" ? tokens.primary : tokens.terminal.successColor
                }
              />
              <span>{file.name}</span>
              {file.isNew && (
                <span
                  style={{
                    fontSize: 10,
                    color: tokens.terminal.successColor,
                    fontWeight: 700,
                    marginLeft: 4,
                  }}
                >
                  NEW
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* File content panel */}
      <div
        style={{
          flex: 1,
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          borderRadius: 10,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          opacity: interpolate(
            frame,
            [expandStart, expandStart + Math.ceil(fps * 0.3)],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }
          ),
        }}
      >
        {/* File tab */}
        <div
          style={{
            height: 36,
            background: tokens.terminal.titleBar,
            borderBottom: `1px solid ${tokens.card.border}`,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 8,
          }}
        >
          <MarkdownIcon size={14} color={tokens.terminal.successColor} />
          <span
            style={{
              fontFamily: tokens.monoFontFamily,
              fontSize: 12,
              color: tokens.foreground,
            }}
          >
            {expandFile}
          </span>
        </div>

        {/* Content area */}
        <div
          style={{
            padding: "20px 24px",
            fontFamily: tokens.monoFontFamily,
            fontSize: 13,
            lineHeight: 1.7,
            overflow: "hidden",
          }}
        >
          {/* Frontmatter */}
          {frontmatter && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: tokens.foregroundLow }}>---</div>
              {frontmatter.split("\n").map((line, li) => {
                const totalFmLines = frontmatter.split("\n").length
                const lineRevealFrame =
                  expandStart + (li / totalFmLines) * contentRevealDuration * 0.5
                const lineOpacity = interpolate(
                  frame,
                  [lineRevealFrame, lineRevealFrame + 6],
                  [0, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }
                )
                const colonIdx = line.indexOf(":")
                const key = colonIdx > 0 ? line.slice(0, colonIdx + 1) : ""
                const val = colonIdx > 0 ? line.slice(colonIdx + 1) : line
                return (
                  <div key={li} style={{ opacity: lineOpacity }}>
                    <span style={{ color: tokens.secondary }}>{key}</span>
                    <span style={{ color: tokens.foreground }}>{val}</span>
                  </div>
                )
              })}
              <div style={{ color: tokens.foregroundLow }}>---</div>
            </div>
          )}

          {/* Body */}
          {body && (
            <div>
              {body.split("\n").map((line, li) => {
                const totalBodyLines = body.split("\n").length
                const lineRevealFrame =
                  expandStart +
                  contentRevealDuration * 0.5 +
                  (li / totalBodyLines) * contentRevealDuration * 0.5
                const lineOpacity = interpolate(
                  frame,
                  [lineRevealFrame, lineRevealFrame + 6],
                  [0, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }
                )
                return (
                  <div key={li} style={{ color: tokens.foreground, opacity: lineOpacity }}>
                    {line || "\u00A0"}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Callout overlay */}
      {calloutText && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 48,
            right: 48,
            background: `${tokens.card.bg}ee`,
            border: `1px solid ${tokens.card.border}`,
            borderLeft: `4px solid ${tokens.primary}`,
            borderRadius: 10,
            padding: "16px 24px",
            fontFamily: tokens.fontFamily,
            fontSize: 20,
            color: tokens.foreground,
            fontWeight: 500,
            opacity: calloutSpring,
            transform: `translateY(${interpolate(calloutSpring, [0, 1], [20, 0])}px)`,
            boxShadow: tokens.card.shadow,
          }}
        >
          {calloutText}
        </div>
      )}
    </AbsoluteFill>
  )
}
