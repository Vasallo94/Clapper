import type { PipelineEvent, PipelineStageId } from "../types"
import { theme } from "../theme"
import { PipelineStepper } from "./PipelineStepper"
import { EventLog } from "./EventLog"

interface Props {
  currentStage: PipelineStageId
  events: PipelineEvent[]
}

export function Sidebar({ currentStage, events }: Props) {
  return (
    <div
      style={{
        width: 260,
        backgroundColor: theme.colors.bg.secondary,
        borderRight: `1px solid ${theme.colors.border.default}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${theme.colors.border.default}` }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.colors.text.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 14,
          }}
        >
          Pipeline
        </div>
        <PipelineStepper currentStage={currentStage} />
      </div>

      <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.colors.text.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          Log
        </div>
        <EventLog events={events} />
      </div>
    </div>
  )
}
