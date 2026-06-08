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
    <path d="M3.5 10V6l2 2.5L7.5 6v4" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 8.5l1.5 1.5 1.5-1.5" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
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
    <path d="M4 2.5l3.5 3.5L4 9.5" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const CheckIcon: React.FC<IconProps> = ({ size = 16, color = "#28c840" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3.5 8.5l3 3 6-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const CrossIcon: React.FC<IconProps> = ({ size = 16, color = "#ff5f57" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const TerminalIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke={color} strokeWidth={1} />
    <path d="M4 7l2.5 2L4 11" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 11h4" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
  </svg>
)

export const CloudIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M4.5 12.5h7.5a3 3 0 000-6 3.5 3.5 0 00-6.5-1.5A2.5 2.5 0 004.5 12.5z"
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
  </svg>
)

export const CodeIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M5 4L1.5 8 5 12" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 4l3.5 4L11 12" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 2.5L7 13.5" stroke={color} strokeWidth={1} strokeLinecap="round" />
  </svg>
)

export const ShieldIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M8 1.5L2.5 4v4c0 3.5 5.5 6 5.5 6s5.5-2.5 5.5-6V4L8 1.5z"
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
    <path d="M6 8l1.5 1.5L10 6" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const GearIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke={color} strokeWidth={1} />
    <path
      d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
      stroke={color}
      strokeWidth={1}
      strokeLinecap="round"
    />
  </svg>
)

export const UserIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="2.5" stroke={color} strokeWidth={1} />
    <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke={color} strokeWidth={1} strokeLinecap="round" />
  </svg>
)

export const BookIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M2 2.5h4.5c.8 0 1.5.7 1.5 1.5v9.5c0-.8-.7-1.5-1.5-1.5H2v-9.5z"
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
    <path
      d="M14 2.5H9.5c-.8 0-1.5.7-1.5 1.5v9.5c0-.8.7-1.5 1.5-1.5H14v-9.5z"
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
    />
  </svg>
)

export const LightbulbIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M6 13h4M6.5 11c-1.5-1-2.5-2.5-2.5-4.5a4 4 0 118 0c0 2-1 3.5-2.5 4.5v1h-3v-1z"
      stroke={color}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const ArrowRightIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const LayersIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L1.5 5.5 8 9.5l6.5-4L8 1.5z" stroke={color} strokeWidth={1} strokeLinejoin="round" />
    <path d="M1.5 8l6.5 4 6.5-4" stroke={color} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1.5 10.5l6.5 4 6.5-4" stroke={color} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const LinkIcon: React.FC<IconProps> = ({ size = 16, color = "#abb2bf" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path
      d="M6.5 9.5a3 3 0 004.2.3l2-2a3 3 0 00-4.2-4.3l-1.2 1.2"
      stroke={color}
      strokeWidth={1.2}
      strokeLinecap="round"
    />
    <path
      d="M9.5 6.5a3 3 0 00-4.2-.3l-2 2a3 3 0 004.2 4.3l1.2-1.2"
      stroke={color}
      strokeWidth={1.2}
      strokeLinecap="round"
    />
  </svg>
)
