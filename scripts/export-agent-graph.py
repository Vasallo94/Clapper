"""Export DeepAgents pipeline graphs as Mermaid + PNG.

Usage:
    cd packages/agent
    uv run python ../../scripts/export-agent-graph.py

Output:
    docs/graphs/langgraph-internal.mmd   — LangGraph internal framework graph
    docs/graphs/langgraph-internal.png
    docs/graphs/pipeline-subagents.mmd   — High-level subagent pipeline
    docs/graphs/pipeline-subagents.png
"""

import os
import sys
from pathlib import Path

# Resolve paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
AGENT_DIR = PROJECT_ROOT / "packages" / "agent"
OUTPUT_DIR = PROJECT_ROOT / "docs" / "graphs"

# Ensure we're running from packages/agent so imports work
os.chdir(AGENT_DIR)
sys.path.insert(0, str(AGENT_DIR))

# Load .env
from dotenv import load_dotenv

load_dotenv(PROJECT_ROOT / ".env")
creds = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
if creds and not Path(creds).is_absolute():
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(PROJECT_ROOT / creds)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def export_langgraph_internal():
    """Export the internal LangGraph framework graph."""
    print("1/2  Exporting LangGraph internal graph...")

    from src.orchestrator import create_video_orchestrator

    agent = create_video_orchestrator()
    graph = agent.get_graph()

    # Mermaid text
    mermaid = graph.draw_mermaid()
    mmd_path = OUTPUT_DIR / "langgraph-internal.mmd"
    mmd_path.write_text(mermaid, encoding="utf-8")
    print(f"     {mmd_path.relative_to(PROJECT_ROOT)}")

    # PNG via mermaid.ink API
    try:
        png_bytes = graph.draw_mermaid_png()
        png_path = OUTPUT_DIR / "langgraph-internal.png"
        png_path.write_bytes(png_bytes)
        print(f"     {png_path.relative_to(PROJECT_ROOT)}")
    except Exception as e:
        print(f"     PNG skipped (mermaid.ink unavailable): {e}")


def export_pipeline_subagents():
    """Export the high-level subagent pipeline diagram."""
    print("2/2  Exporting pipeline subagents graph...")

    mermaid = """%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#CC3333', 'primaryTextColor': '#E8E8E8', 'primaryBorderColor': '#CC3333', 'lineColor': '#888888', 'secondaryColor': '#1A1A1A', 'tertiaryColor': '#141414', 'background': '#0D0D0D', 'mainBkg': '#1A1A1A', 'nodeBorder': '#2A2A2A', 'clusterBkg': '#141414', 'clusterBorder': '#2A2A2A', 'titleColor': '#E8E8E8', 'edgeLabelBackground': '#141414'}}}%%
graph TD
    START([fa:fa-user Usuario]):::startEnd --> orchestrator[fa:fa-sitemap Orchestrator]:::orchestrator

    orchestrator --> researcher[fa:fa-search Researcher<br/><i>gemini-3.1-flash-lite</i>]:::agent
    researcher --> copywriter[fa:fa-pen Copywriter<br/><i>gemini-3.1-pro</i>]:::agent

    copywriter --> escaleta_review{Escaleta<br/>checkpoint}:::checkpoint
    escaleta_review -->|aprobado| director[fa:fa-film Director<br/><i>gemini-3.1-pro</i>]:::agent
    escaleta_review -->|cambios| copywriter

    director --> sound_engineer[fa:fa-music Sound Engineer<br/><i>gemini-3.1-pro</i>]:::agent
    sound_engineer --> sound_review{Carta sonido<br/>checkpoint}:::checkpoint
    sound_review -->|aprobado| render[fa:fa-video submit_render]:::tool
    sound_review -->|cambios| sound_engineer

    render --> status[fa:fa-spinner check_render_status]:::tool
    status --> DONE([fa:fa-check Video completado]):::startEnd

    classDef startEnd fill:#CC3333,stroke:#CC3333,color:#fff,font-weight:bold
    classDef orchestrator fill:#2A2A2A,stroke:#CC3333,color:#E8E8E8,font-weight:bold,stroke-width:2px
    classDef agent fill:#1A1A1A,stroke:#888888,color:#E8E8E8
    classDef checkpoint fill:#0D0D0D,stroke:#F59E0B,color:#F59E0B,font-weight:bold
    classDef tool fill:#1A1A1A,stroke:#22C55E,color:#22C55E
"""

    # Save Mermaid text
    mmd_path = OUTPUT_DIR / "pipeline-subagents.mmd"
    mmd_path.write_text(mermaid, encoding="utf-8")
    print(f"     {mmd_path.relative_to(PROJECT_ROOT)}")

    # Render PNG via mermaid.ink API
    try:
        from langchain_core.runnables.graph_mermaid import draw_mermaid_png

        png_bytes = draw_mermaid_png(mermaid_syntax=mermaid)
        png_path = OUTPUT_DIR / "pipeline-subagents.png"
        png_path.write_bytes(png_bytes)
        print(f"     {png_path.relative_to(PROJECT_ROOT)}")
    except Exception as e:
        print(f"     PNG skipped (mermaid.ink unavailable): {e}")


if __name__ == "__main__":
    print(f"Exporting agent graphs to {OUTPUT_DIR.relative_to(PROJECT_ROOT)}/\n")
    export_langgraph_internal()
    print()
    export_pipeline_subagents()
    print("\nDone.")
