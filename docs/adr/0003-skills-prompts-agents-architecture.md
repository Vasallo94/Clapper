# ADR 0003: Skills / Prompts / Agents Architecture

## Status

Accepted

## Date

2026-05-04

## Context

The video generation pipeline uses DeepAgents (v0.5.3+) with an orchestrator and 8 subagents. Each subagent has a system prompt that mixes two types of information:

1. **Workflow instructions**: what to do, in what order, which tools to call, filesystem paths for state management, stop conditions.
2. **Domain knowledge**: available scene types and their fields, brand identity rules, creative principles, volume references, timing constraints.

This causes several problems:

- **Duplication**: scene type catalogs appear in both the copywriter and validator prompts. Brand colors appear in multiple prompts. Volume references appear in both audio_planner and sound_engineer.
- **Fragility**: updating a scene type requires editing multiple prompts. A missed update causes inconsistent behavior between agents.
- **No progressive disclosure**: all domain knowledge is loaded into every agent's system prompt on every invocation, even when the task doesn't need it. This wastes tokens and dilutes the agent's attention.
- **Subagent skills gap**: the orchestrator has access to 5 skills (sound-engineer, remotion-best-practices, remotion-director, remotion-tutorial-generator, remotion-short-ld) via SkillsMiddleware, but none of the 8 subagents receive any skills. DeepAgents does NOT inherit skills from parent to child — it's opt-in via a `"skills"` key in each subagent spec.

## Decision

Separate domain knowledge from workflow instructions. Domain knowledge lives in DeepAgents skills (directories with `SKILL.md` + frontmatter). Workflow instructions stay in system prompts.

### Separation principle

| Content type            | Goes in | Example                                                              |
| ----------------------- | ------- | -------------------------------------------------------------------- |
| Agent role and identity | Prompt  | "You are a video copywriter for Linea Directa"                       |
| Step-by-step workflow   | Prompt  | "1. Read brief. 2. Generate escaleta. 3. Present for approval"       |
| Tool usage instructions | Prompt  | "Call `present_escaleta` with scenes and brief"                      |
| Filesystem state paths  | Prompt  | "Read from `/pipeline/brief.json`, write to `/pipeline/config.json`" |
| Stop conditions         | Prompt  | "If APPROVED, return config. Do NOT call present_escaleta again"     |
| Available scene types   | Skill   | Scene catalog with fields, types, constraints                        |
| Brand identity          | Skill   | Colors, mascot rules, tone, composition defaults                     |
| Creative principles     | Skill   | Emotional arc, pacing, copy density rules                            |
| Audio domain knowledge  | Skill   | Volume references, ducking patterns, voice options                   |
| Remotion code patterns  | Skill   | Animation rules, spring configs, theme tokens                        |

### Skill assignment

All subagents that need at least one skill receive `"skills": [str(SKILLS_DIR)]` (the full skills directory). Progressive disclosure handles relevance filtering — agents only `read_file` a SKILL.md when its description matches the current task.

| Subagent        | Relevant skills                                    | Why                                                              |
| --------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| copywriter      | scene-catalog, brand-guidelines                    | Needs scene types for config generation, brand identity for tone |
| director        | scene-catalog, brand-guidelines, remotion-director | Timing constraints per scene type, visual identity               |
| audio_planner   | sound-engineer                                     | Audio formats, voice options, volume references                  |
| sound_engineer  | sound-engineer                                     | Library structure, volume references                             |
| scene_creator   | scene-catalog, remotion-best-practices             | Custom components reference, Remotion code patterns              |
| validator       | scene-catalog                                      | Scene type validation                                            |
| researcher      | _(none)_                                           | Web research only                                                |
| voice_generator | _(none)_                                           | TTS API calls only                                               |
| reviewer        | _(none)_                                           | ffprobe checks only                                              |

### New skills

| Skill                  | Content (moved from)                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| `scene-catalog`        | Scene types + fields from copywriter.md, custom components from registry |
| `brand-guidelines`     | Brand identity from copywriter.md creative rules, theme tokens           |
| `video-best-practices` | Config structure rules, creative principles, pacing                      |

## Consequences

### Positive

- Single source of truth for domain knowledge (one skill, used by N agents).
- Prompts become shorter and focused on workflow.
- Progressive disclosure: agents only load domain knowledge when the task description matches a skill.
- Skill updates propagate to all consuming agents automatically.
- Skills are reusable across projects — not tied to a specific agent's prompt.

### Negative

- One more abstraction layer to understand and maintain.
- Agents must successfully match and read skills — if the description is poor, the skill won't activate.
- All subagents see all skills' metadata (Option A); agents with no relevant skills see a few extra lines of metadata.

### Risks

- **Skill description quality**: if a skill's `description` doesn't match the agent's task, progressive disclosure fails and the agent ignores the skill. Mitigation: write descriptions that clearly name the task trigger.
- **Prompt/skill boundary drift**: over time, domain knowledge might creep back into prompts. Mitigation: code review checklist item — "is this workflow or domain knowledge?"

## Options Considered

### Option A: Single skills path for all subagents (chosen)

Pass `"skills": [str(SKILLS_DIR)]` to every subagent that needs skills. All skills are visible via metadata; agents read only what matches.

- Pro: simple, no per-agent skill routing
- Pro: progressive disclosure handles relevance
- Con: agents see metadata for irrelevant skills (minimal overhead)

### Option B: Per-agent skill paths

Pass individual skill paths: `"skills": [str(SKILLS_DIR / "scene-catalog"), str(SKILLS_DIR / "brand-guidelines")]`.

- Pro: precise, no irrelevant metadata
- Con: more maintenance, must verify DeepAgents accepts individual skill paths
- Con: adding a new skill requires updating every relevant factory
