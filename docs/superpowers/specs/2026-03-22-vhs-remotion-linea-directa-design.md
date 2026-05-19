# VHS + Remotion Tutorial Pipeline with Linea Directa Branding

## Summary

Integrate VHS (Charmbracelet) terminal recordings into the Remotion tutorial pipeline, add a `screenRecording` scene type, implement Linea Directa brand theming across all scenes, and create a pixel art mascot of their iconic red phone with wheels.

## Motivation

The current `TerminalScene` simulates terminal output with typed text. Real-world tutorial videos (like those on X/Twitter for Claude Code) use actual terminal recordings where commands execute for real. VHS enables scripted, reproducible terminal recordings that produce authentic output. Combining VHS with Remotion gives us authenticity + polished composition (intros, callouts, branding).

The branding targets Linea Directa Aseguradora for a presentation/demo showing how Claude Code can help their development teams.

## Pipeline Flow

```
Skill generates    VHS executes     Skill generates     Remotion renders
  .tape file    →  → raw .mp4    →   config.json     →  → final .mp4
```

### Per-tutorial folder structure

```
tutorials/[slug]/
├── recording.tape          # VHS script
├── assets/
│   └── recording.mp4       # VHS output (gitignored via tutorials/*/assets/*.mp4)
├── config.json             # Remotion config
└── output.mp4              # Final video (gitignored)
```

## Schema Changes

### New root-level `theme` field

```typescript
theme: z.enum(["default", "linea-directa"]).default("default")
```

When `"linea-directa"`, all scenes use the LD color palette and the pixel art mascot appears in intro/outro.

### New `ScreenRecordingScene` schema

```typescript
const ScreenRecordingSceneSchema = z.object({
  type: z.literal("screenRecording"),
  src: z.string(), // relative to tutorial dir, e.g. "assets/recording.mp4"
  trim: z
    .object({
      startSec: z.number().min(0),
      endSec: z.number().min(0),
    })
    .refine((t) => t.endSec > t.startSec, "endSec must be greater than startSec")
    .optional(),
  frame: z
    .object({
      background: z.string().default("#FFFFFF"),
      borderRadius: z.number().default(12),
      padding: z.number().default(40),
      shadow: z.boolean().default(true),
    })
    .optional(),
  resolvedSrc: z.string().optional(), // injected by render.ts at runtime, not in config.json
  durationInSeconds: z.number().min(1).max(120),
})
```

Added to the `SceneSchema` union alongside existing scene types.

**Duration contract:** `durationInSeconds` defines how long the scene lasts in the final video. If `trim` is specified, the trimmed video region (endSec - startSec) is played. If the trimmed region is shorter than `durationInSeconds`, the video freezes on its last frame. If longer, the video is cut at `durationInSeconds`. This matches Remotion's default `<Video>` behavior.

### Asset resolution for `<Video>`

Remotion renders in a browser context where filesystem paths don't work. The render script (`render.ts`) must copy video assets into `public/` before bundling:

1. Before calling `bundle()`, the render script reads the config and finds all `screenRecording` scenes
2. For each, it copies `tutorials/[slug]/[src]` → `public/tutorial-assets/[slug]/[filename]`
3. The `ScreenRecordingScene` component uses `staticFile('tutorial-assets/[slug]/[filename]')` to reference it
4. The render script passes the resolved path via input props (`resolvedSrc`)
5. After rendering (in a `try/finally`), the copied files in `public/tutorial-assets/` are cleaned up
6. If an asset file does not exist, the render script fails early with a clear error message

**Trim-to-frame conversion:** `startFrom = Math.round(trim.startSec * fps)`, video plays from that frame. Remotion's `<Video>` handles the rest natively.

This avoids permanent changes to `public/` and works within Remotion's bundler constraints.

## Brand Theme: Linea Directa

### Color palette

| Token          | Hex       | Usage                                  |
| -------------- | --------- | -------------------------------------- |
| Primary red    | `#CC3333` | Accents, lines, bullet points, borders |
| Text primary   | `#1A1A1A` | Headings, body text                    |
| Text secondary | `#888888` | Subtitles, muted text                  |
| Background     | `#FFFFFF` | All scene backgrounds                  |
| Highlight red  | `#FF5555` | Pixel art highlights                   |

### Scene theming

**IntroScene (linea-directa):**

- Background: white
- Title: `#1A1A1A`, no gradient
- Decorative line: solid `#CC3333` (replaces green/blue gradient)
- Mascot pixel art centered above title
- Subtitle prefix: "Linea Directa · Claude Code"

**CalloutScene (linea-directa):**

- Background: white
- Left border: 4px solid `#CC3333`
- Text: `#1A1A1A`
- No overlay

**OutroScene (linea-directa):**

- Background: white
- Bullet points: red dot `#CC3333`
- Small pixel art mascot in corner

**ScreenRecordingScene:**

- White background with padded, rounded frame
- Drop shadow on the video embed
- Theme-agnostic (the VHS recording has its own dark terminal theme)

### Pixel art mascot

React component rendering a ~32x32 logical pixel grid scaled to ~120px. Depicts the Linea Directa logo: a red rotary telephone (`#CC3333`) mounted on black wheels (`#1A1A1A`) with `#FF5555` highlights. Animated with `spring()` bounce on intro.

Implemented as pure React (grid of styled divs or inline SVG), no external image dependency.

## Component Changes

### Files to create

1. **`src/compositions/ClaudeCodeTutorial/components/PixelPhoneMascot.tsx`**
   - Pixel art grid component
   - Props: `scale`, `animate` (boolean)
   - Uses `useCurrentFrame()` + `spring()` for bounce

2. **`src/compositions/ClaudeCodeTutorial/scenes/ScreenRecordingScene.tsx`**
   - Renders Remotion `<Video>` with the VHS `.mp4`
   - Wraps in frame (background, border-radius, shadow, padding)
   - Handles `trim` via `startFrom` and `endAt` on `<Sequence>`
   - Entry animation: fade + slide up via `spring()`

### Files to modify

3. **`schema.ts`**
   - Add `ScreenRecordingSceneSchema` to `SceneSchema` union
   - Add `theme` field to `TutorialConfigSchema`

4. **`ClaudeCodeTutorial.tsx`**
   - Render `ScreenRecordingScene` when `scene.type === "screenRecording"`
   - Provide `theme` via React Context (`ThemeContext`) so all scenes access it without prop drilling
   - Make outer `AbsoluteFill` background theme-aware: `#0d1117` for default, `#FFFFFF` for linea-directa

5. **`IntroScene.tsx`**
   - Read theme from `ThemeContext`
   - Conditional styling for `linea-directa`: white bg, red accent, mascot

6. **`CalloutScene.tsx`**
   - Read theme from `ThemeContext`
   - Conditional styling: white bg, red left border

7. **`OutroScene.tsx`**
   - Read theme from `ThemeContext`
   - Conditional styling: white bg, red bullets, small mascot

8. **`scripts/render.ts`**
   - Before bundling: copy video assets from `tutorials/[slug]/assets/` → `public/tutorial-assets/[slug]/`
   - Pass resolved `staticFile()` paths to the composition via input props
   - After rendering: clean up `public/tutorial-assets/`

9. **`.gitignore`**
   - Add `tutorials/*/assets/*.mp4` to prevent VHS recordings from being committed
   - Add `public/tutorial-assets/` to prevent temp copies from being committed

10. **`.claude/skills/tutorial-generator/SKILL.md`**

- Add VHS tape generation step
- Add VHS execution step with fallback
- Document `theme` field and `screenRecording` scene

### Files NOT modified

- `TerminalScene.tsx` — remains as fallback
- `customSceneRegistry.ts` — not used
- `Root.tsx` — `calculateMetadata` already dynamic

## VHS Integration

### Tape file generation

The skill generates `.tape` from demo subagent output:

```tape
Output assets/recording.mp4
Set Theme "Catppuccin Mocha"
Set FontSize 18
Set Width 1200
Set Height 600
Set Padding 20
Set WaitTimeout 60s

Type "claude"
Enter
Wait />/
Sleep 1s
Type "usa EnterWorktree para crear un worktree"
Enter
Wait /Created worktree/
Sleep 2s
```

### Execution

```bash
cd tutorials/[slug] && vhs recording.tape
```

### Prerequisites

- `vhs` installed (`brew install vhs`)
- `claude` CLI in PATH
- `ffmpeg` and `ttyd` (VHS dependencies, installed with VHS)

### Fallback

If VHS fails (missing deps, timeout), the skill:

1. Informs the user of the failure
2. Offers manual recording (drop `.mp4` in `assets/`)
3. Offers `TerminalScene` simulation as alternative

## Theme Context

Theme is delivered via React Context, not prop drilling:

```typescript
// src/compositions/ClaudeCodeTutorial/ThemeContext.ts
export type ThemeName = "default" | "linea-directa"
export const ThemeContext = React.createContext<ThemeName>("default")
export const useTheme = () => React.useContext(ThemeContext)
```

`ClaudeCodeTutorial.tsx` wraps all scenes in `<ThemeContext.Provider value={config.theme}>`. Each scene calls `useTheme()` internally.

## Audio

VHS recordings may contain an audio track. The `<Video>` in `ScreenRecordingScene` uses `volume={0}` to mute it. Tutorial audio (if any) comes from the voiceover system, not from VHS.

## Dependencies

- **npm**: None new. `<Video>` is in `remotion` core.
- **External**: VHS (`brew install vhs`), which requires `ffmpeg` and `ttyd`.

## Example config.json

```json
{
  "id": "git-worktrees-claude-code",
  "title": "Git Worktrees en Claude Code",
  "description": "Cómo usar git worktrees para trabajar en ramas aisladas",
  "theme": "linea-directa",
  "fps": 30,
  "width": 1280,
  "height": 720,
  "scenes": [
    {
      "type": "intro",
      "title": "Git Worktrees en Claude Code",
      "subtitle": "Trabaja en ramas paralelas sin perder contexto",
      "durationInSeconds": 4
    },
    {
      "type": "screenRecording",
      "src": "assets/recording.mp4",
      "trim": { "startSec": 0.5, "endSec": 28 },
      "frame": { "background": "#FFFFFF", "padding": 48 },
      "durationInSeconds": 27.5
    },
    {
      "type": "callout",
      "text": "Ideal para revisar bugs en producción mientras desarrollas una feature.",
      "position": "bottom",
      "durationInSeconds": 4
    },
    {
      "type": "outro",
      "title": "Git Worktrees: Lo esencial",
      "bullets": [
        "EnterWorktree crea una rama aislada en .claude/worktrees/",
        "ExitWorktree(keep) preserva · ExitWorktree(remove) limpia",
        "Cada worktree tiene su propio contexto de sesión"
      ],
      "durationInSeconds": 6
    }
  ]
}
```
