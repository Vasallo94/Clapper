# Skill Escaleta Validation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-facing escaleta validation step to all video generation skills so the user approves the script before config.json is generated.

**Architecture:** Pure documentation change — modify three markdown files (two skills + CLAUDE.md). No code changes.

**Tech Stack:** Markdown (SKILL.md files), CLAUDE.md project instructions.

**Spec:** `docs/superpowers/specs/2026-03-23-skill-escaleta-validation-design.md`

---

### Task 1: Update remotion-short-ld skill

**Files:**
- Modify: `.claude/skills/remotion-short-ld/SKILL.md`

This is the simpler change — Copywriting already exists as Paso 2, so we insert the new step between Paso 2 and Paso 3, then renumber.

- [ ] **Step 1: Insert Paso 3 (Escaleta) after current Paso 2 (Copywriting)**

Replace the current `## Paso 3: Genera config.json` heading and renumber all subsequent steps. The new Paso 3 content:

```markdown
## Paso 3: Escaleta — Validación con el usuario

Antes de generar el config.json, presenta la escaleta completa al usuario para su aprobación.

### Formato de la escaleta

Genera un bloque de texto con este formato y preséntalo usando `AskUserQuestion`:

```
## Script: [nombre del producto]

**Escena 1 — hero ([duración]s)**
  Producto: [nombre]
  Headline: "[headline]"

**Escena 2 — benefits ([duración]s)**
  Título: "[título]"
  • [emoji] [texto beneficio 1]
  • [emoji] [texto beneficio 2]
  • [emoji] [texto beneficio 3]

**Escena 3 — pricing ([duración]s)**
  Precio: [precio]
  Periodo: [periodo]
  Variante: [light/dark]

**Escena 4 — cta ([duración]s)**
  CTA: "[texto]"
  URL: [url]

Duración total: ~[total]s
```

### Interacción

Usa `AskUserQuestion` con dos opciones:
- **Aprobar**: continuar al Paso 4 (genera config.json).
- **Pedir cambios**: el usuario indica qué ajustar. Modifica la escaleta y vuelve a presentarla.

El bucle no tiene límite de iteraciones. Repite hasta que el usuario apruebe.
```

- [ ] **Step 2: Renumber Paso 3 → Paso 4 (Genera config.json)**

Change `## Paso 3: Genera config.json` to `## Paso 4: Genera config.json`. Update the intro text to reference that the content was already validado en el paso anterior.

- [ ] **Step 3: Renumber Paso 4 → Paso 5 (Renderizar)**

Change `## Paso 4: Renderizar` to `## Paso 5: Renderizar`.

- [ ] **Step 4: Renumber Paso 5 → Paso 6 (Resumen)**

Change `## Paso 5: Resumen` to `## Paso 6: Resumen`.

- [ ] **Step 5: Verify the file reads correctly**

Read the full file and verify: 6 pasos in order (Research → Copywriting → Escaleta → Config → Render → Resumen), no broken references.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/remotion-short-ld/SKILL.md
git commit -m "feat(skill): add escaleta validation to remotion-short-ld"
```

---

### Task 2: Update remotion-tutorial-generator skill

**Files:**
- Modify: `.claude/skills/remotion-tutorial-generator/SKILL.md`

This requires extracting the implicit copywriting from the current Paso 3 into its own step, then inserting the escaleta validation, then renumbering.

- [ ] **Step 1: Extract Paso 3 into two parts — Copywriting (new Paso 3) and Config (new Paso 5)**

The current `## Paso 3: Genera config.json` contains both content decisions (structure, theme, scene types) and the actual JSON generation. Split it:

**New Paso 3 (Copywriting):** Keep the "Estructura mínima de un buen tutorial" section and the content-decision guidance. This step generates the creative content but does NOT write the JSON yet.

```markdown
## Paso 3: Copywriting

Con toda la información recopilada (research + demo), diseña el contenido del tutorial:

### Estructura mínima de un buen tutorial:
1. `intro` (3-5s): título llamativo que explique qué va a aprender el usuario
2. `terminal` (6-15s): demostración real del comando con líneas de tipo command, output, claude
3. `callout` (3-5s): explicación del "por qué" o "cuándo usar" en lenguaje natural
4. `outro` (4-8s): resumen con bullets accionables
```

- [ ] **Step 2: Insert new Paso 4 (Escaleta)**

```markdown
## Paso 4: Escaleta — Validación con el usuario

Antes de generar el config.json, presenta la escaleta completa al usuario para su aprobación.

### Formato de la escaleta

Genera un bloque de texto con este formato y preséntalo usando `AskUserQuestion`:

```
## Script: [título del tutorial]

**Escena 1 — intro ([duración]s)**
  Título: "[título]"
  Subtítulo: "[subtítulo]"

**Escena 2 — terminal ([duración]s)**
  > [command] texto del comando
  [output] texto del output
  [claude] respuesta de Claude
  (líneas en blanco como separadores)

**Escena 3 — callout ([duración]s)**
  "[texto del callout]"
  Posición: [top/bottom/right]

**Escena 4 — outro ([duración]s)**
  Título: "[título]"
  • Bullet 1
  • Bullet 2
  • Bullet 3

Duración total: ~[total]s
```

### Interacción

Usa `AskUserQuestion` con dos opciones:
- **Aprobar**: continuar al Paso 5 (genera config.json).
- **Pedir cambios**: el usuario indica qué ajustar. Modifica la escaleta y vuelve a presentarla.

El bucle no tiene límite de iteraciones. Repite hasta que el usuario apruebe.
```

- [ ] **Step 3: Create new Paso 5 (Genera config.json)**

The technical config generation parts (schema reference, theme field, terminal rules, custom scenes, code rules) move here. Update heading to `## Paso 5: Genera config.json` and add intro text: "Con la escaleta aprobada, escribe `tutorials/[slug]/config.json`."

- [ ] **Step 4: Renumber Paso 4 → Paso 6 (Renderizar)**

Change `## Paso 4: Renderizar` to `## Paso 6: Renderizar`.

- [ ] **Step 5: Renumber Paso 5 → Paso 7 (Resumen)**

Change `## Paso 5: Resumen` to `## Paso 7: Resumen`.

- [ ] **Step 6: Verify the file reads correctly**

Read the full file and verify: 7 pasos in order (Research → Demo → Copywriting → Escaleta → Config → Render → Resumen), no broken references.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/remotion-tutorial-generator/SKILL.md
git commit -m "feat(skill): add escaleta validation to remotion-tutorial-generator"
```

---

### Task 3: Update CLAUDE.md with global convention

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add escaleta validation rule to Critical constraints section**

After the last bullet in `## Critical constraints`, add:

```markdown
- **Escaleta validation required.** All video generation skills must present a full escaleta (script) to the user via `AskUserQuestion` and obtain explicit approval before generating `config.json`. The iteration loop has no round limit. Research remains automatic.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add escaleta validation rule to CLAUDE.md"
```
