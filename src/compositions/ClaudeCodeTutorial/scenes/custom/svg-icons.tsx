// src/compositions/ClaudeCodeTutorial/scenes/custom/svg-icons.tsx
import React from "react"

interface IconProps {
  size?: number
  color?: string
}

export const FolderIcon: React.FC<IconProps> = ({ size = 16, color = "#61afef" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M1.5 2.5h4.25l1.5 1.5h7.25v9.5h-13v-11z"
      fill={color}
      fillOpacity={0.15}
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
  </svg>
)

export const FileIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M3 1.5h6.5L13 5v9.5H3v-13z"
      fill={color}
      fillOpacity={0.08}
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
    <path d="M9.5 1.5V5H13" stroke={color} strokeWidth={1} strokeLinejoin="round" />
  </svg>
)

export const MarkdownIcon: React.FC<IconProps> = ({ size = 16, color = "#98c379" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="10" rx="1.5" stroke={color} strokeWidth={1} />
    <path
      d="M3.5 10V6l2 2.5L7.5 6v4"
      stroke={color}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 8.5l1.5 1.5 1.5-1.5"
      stroke={color}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M11.5 6v4" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
  </svg>
)

export const ChevronIcon: React.FC<IconProps & { open?: boolean }> = ({
  size = 12,
  color = "#636d83",
  open = true,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
  >
    <path
      d="M4 2.5l3.5 3.5L4 9.5"
      stroke={color}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
