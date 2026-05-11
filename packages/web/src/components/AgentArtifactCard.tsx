import type { AgentArtifact, AudioChartData, IntentDecisionData, ValidationReportData } from "../types"
import { theme } from "../theme"
import { SoundChartCard } from "./SoundChartCard"
import { ValidationReportCard } from "./ValidationReportCard"
import { IntentDecisionCard } from "./IntentDecisionCard"

interface Props {
  artifact: AgentArtifact
}

export function AgentArtifactCard({ artifact }: Props) {
  if (artifact.kind === "validation" && artifact.data) {
    return <ValidationReportCard compact data={artifact.data as unknown as ValidationReportData} />
  }

  if (artifact.kind === "audio_chart" && artifact.data) {
    return (
      <SoundChartCard
        compact
        data={{ type: "audio_chart_checkpoint", ...artifact.data } as unknown as AudioChartData}
        disabled
      />
    )
  }

  if (artifact.kind === "intent_decision" && artifact.data) {
    return <IntentDecisionCard compact data={artifact.data as unknown as IntentDecisionData} />
  }

  return (
    <div
      style={{
        border: `1px solid ${theme.colors.border.default}`,
        borderRadius: theme.radius.md,
        padding: "8px 10px",
        marginTop: 8,
        backgroundColor: theme.colors.bg.primary,
      }}
    >
      <div
        style={{
          color: theme.colors.text.secondary,
          fontSize: 11,
          fontWeight: 700,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {artifact.title}
        {artifact.source ? <span style={{ color: theme.colors.text.muted }}> · {artifact.source}</span> : null}
      </div>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: theme.colors.text.secondary,
          fontFamily: theme.fonts.mono,
          fontSize: 11,
          lineHeight: 1.45,
          maxHeight: 180,
          overflow: "auto",
        }}
      >
        {artifact.content ?? JSON.stringify(artifact.data, null, 2)}
      </pre>
    </div>
  )
}
