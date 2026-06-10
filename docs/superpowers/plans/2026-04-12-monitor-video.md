# Monitor Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear `tutorials/monitor/config.json` con 6 escenas que demuestran el Monitor tool de Claude Code — contraste /loop vs Monitor, mecánica de eventos, demo de test suite y demo de PR polling.

**Architecture:** Un único archivo JSON leído por la composición `ClaudeCodeTutorial` (1280×720, tema `linea-directa`). Sin código nuevo — sólo config. La composición existente renderiza las escenas `intro`, `terminal`, `callout` y `outro` con los datos del JSON. Verificación = preview en Remotion Studio escena a escena.

**Tech Stack:** Remotion, JSON config, `npx tsx scripts/render.ts` para render final, `npm run dev` para preview.

---

## File Structure

| Acción | Archivo                         | Responsabilidad                      |
| ------ | ------------------------------- | ------------------------------------ |
| Crear  | `tutorials/monitor/config.json` | Config completa del video: 6 escenas |

No se crea ni modifica ningún otro archivo.

---

## Task 1: Scaffold del config con intro y outro

**Files:**

- Create: `tutorials/monitor/config.json`

- [ ] **Step 1: Crear el directorio y el scaffold mínimo**

Crear `tutorials/monitor/config.json` con esta estructura (sin escenas intermedias aún):

```json
{
  "id": "monitor",
  "title": "/monitor — Deja de hacer polling",
  "description": "Cómo usar el Monitor tool de Claude Code para reaccionar a eventos en vez de hacer polling",
  "theme": "linea-directa",
  "fps": 30,
  "width": 1280,
  "height": 720,
  "scenes": [
    {
      "type": "intro",
      "title": "/monitor",
      "subtitle": "Deja de hacer polling, empieza a reaccionar",
      "durationInSeconds": 4
    },
    {
      "type": "outro",
      "title": "Monitor en Claude Code",
      "bullets": [
        "Monitor = eventos, no polling",
        "stdout → notificacion instantanea a Claude",
        "persistent: true para toda la sesion",
        "timeout_ms para procesos acotados"
      ],
      "durationInSeconds": 6
    }
  ]
}
```

- [ ] **Step 2: Verificar que el scaffold se renderiza sin errores**

Abrir Remotion Studio:

```bash
npm run dev
```

Seleccionar composición `ClaudeCodeTutorial` e introducir el config. Verificar que intro y outro se renderizan sin error de Zod.

- [ ] **Step 3: Commit del scaffold**

```bash
git add tutorials/monitor/config.json
git commit -m "feat(video): scaffold monitor tutorial — intro + outro"
```

---

## Task 2: Escena 2 — El problema con /loop

**Files:**

- Modify: `tutorials/monitor/config.json`

- [ ] **Step 1: Insertar la escena terminal del problema entre intro y outro**

Añadir esta escena como segundo elemento del array `scenes` (entre intro y outro):

```json
{
  "type": "terminal",
  "title": "El problema con /loop",
  "lines": [
    { "kind": "command", "text": "/loop 2m \"avisa si falla algun test\"" },
    { "kind": "blank", "text": "" },
    { "kind": "output", "text": "[llamada 1/4 — sin fallos]" },
    { "kind": "output", "text": "[llamada 2/4 — sin fallos]" },
    { "kind": "output", "text": "[llamada 3/4 — sin fallos]" },
    { "kind": "output", "text": "[llamada 4/4 — FALLO detectado]", "delayAfterMs": 600 },
    { "kind": "blank", "text": "" },
    { "kind": "claude", "text": "3 llamadas API desperdiciadas antes de detectar el fallo." }
  ],
  "durationInSeconds": 10
}
```

- [ ] **Step 2: Verificar en Remotion Studio**

Con `npm run dev` activo, verificar que la escena terminal muestra las 4 líneas de output con el ritmo correcto. El mensaje de Claude al final debe aparecer con el tono adecuado (naranja, label "Claude").

- [ ] **Step 3: Commit**

```bash
git add tutorials/monitor/config.json
git commit -m "feat(video): add /loop problem scene to monitor tutorial"
```

---

## Task 3: Escena 3 — Callout de mecánica

**Files:**

- Modify: `tutorials/monitor/config.json`

- [ ] **Step 1: Insertar el callout entre la escena del problema y el outro**

Añadir esta escena como tercer elemento del array `scenes`:

```json
{
  "type": "callout",
  "text": "Monitor lanza un proceso en background. Cada linea de stdout se convierte en un evento que despierta a Claude. Silencio = 0 tokens.",
  "position": "bottom",
  "background": "overlay",
  "durationInSeconds": 5
}
```

- [ ] **Step 2: Verificar en Remotion Studio**

Confirmar que el callout aparece centrado, con fondo overlay y texto legible sobre el fondo del tema `linea-directa`.

- [ ] **Step 3: Commit**

```bash
git add tutorials/monitor/config.json
git commit -m "feat(video): add monitor mechanics callout scene"
```

---

## Task 4: Escena 4 — Demo test suite

**Files:**

- Modify: `tutorials/monitor/config.json`

- [ ] **Step 1: Insertar la demo de test suite antes del outro**

Añadir esta escena como cuarto elemento del array `scenes`:

```json
{
  "type": "terminal",
  "title": "Demo — Atrapa el primer fallo",
  "lines": [
    { "kind": "command", "text": "monitorea los tests, avisa si algo falla y abre el archivo" },
    { "kind": "blank", "text": "" },
    { "kind": "claude", "text": "Lanzo monitor sobre pytest filtrando FAILED y ERROR..." },
    { "kind": "output", "text": "[Monitor activo: pytest --tb=short | grep -E \"FAILED|ERROR\"]" },
    { "kind": "blank", "text": "", "delayAfterMs": 1200 },
    { "kind": "output", "text": "FAILED tests/api/test_auth.py::test_token_expiry" },
    { "kind": "blank", "text": "" },
    { "kind": "claude", "text": "Fallo en test_token_expiry. Abro el archivo y propongo el fix." }
  ],
  "durationInSeconds": 12
}
```

- [ ] **Step 2: Verificar en Remotion Studio**

Verificar que el `delayAfterMs: 1200` en el blank genera una pausa visible — debe sentirse como "silencio mientras corren los tests" antes de que aparezca el FAILED. Si la pausa no es suficientemente larga, aumentar a `1800`.

- [ ] **Step 3: Commit**

```bash
git add tutorials/monitor/config.json
git commit -m "feat(video): add test suite monitor demo scene"
```

---

## Task 5: Escena 5 — Demo PR polling

**Files:**

- Modify: `tutorials/monitor/config.json`

- [ ] **Step 1: Insertar la demo de PR polling antes del outro**

Añadir esta escena como quinto elemento del array `scenes`:

```json
{
  "type": "terminal",
  "title": "Demo — Reacciona al review del PR",
  "lines": [
    { "kind": "command", "text": "avisa cuando llegue un review en el PR #142" },
    { "kind": "blank", "text": "" },
    { "kind": "claude", "text": "Lanzo monitor con polling cada 30s sobre el PR..." },
    { "kind": "output", "text": "[Monitor activo — polling gh pr view 142 cada 30s]" },
    { "kind": "blank", "text": "", "delayAfterMs": 1200 },
    { "kind": "output", "text": "NEW_REVIEW: \"Este endpoint necesita validacion de input\"" },
    { "kind": "blank", "text": "" },
    { "kind": "claude", "text": "Review recibido. Implemento la validacion ahora." }
  ],
  "durationInSeconds": 12
}
```

- [ ] **Step 2: Verificar en Remotion Studio**

Comprobar que las dos demos (escena 4 y 5) tienen el mismo ritmo visual — la pausa de silencio debe sentirse igual de larga en ambas. Si hay diferencia perceptible, ajustar `delayAfterMs` para que sean consistentes.

- [ ] **Step 3: Commit**

```bash
git add tutorials/monitor/config.json
git commit -m "feat(video): add PR polling monitor demo scene"
```

---

## Task 6: Revisión final y render

**Files:**

- Modify: `tutorials/monitor/config.json` (ajustes menores de timing si los hay)

- [ ] **Step 1: Revisar el flujo completo en Remotion Studio**

Con `npm run dev`, ver todas las escenas seguidas. Checklist:

- [ ] Escena 2: Las 4 líneas de output aparecen con ritmo, la línea de Claude cierra la idea
- [ ] Escena 3: El callout es legible y dura suficiente para leerlo entero (~5s)
- [ ] Escena 4: El silencio antes de FAILED es perceptible
- [ ] Escena 5: El silencio antes de NEW_REVIEW es perceptible y equivalente al de la escena 4
- [ ] Escena 6 (outro): Los 4 bullets son legibles antes de que termine la escena

Si algún `durationInSeconds` necesita ajuste, modificarlo ahora.

- [ ] **Step 2: Render final a MP4**

```bash
npx tsx scripts/render.ts tutorials/monitor/config.json
```

Esperar a que complete. El output se guarda en `tutorials/monitor/output.mp4` (gitignored).

- [ ] **Step 3: Reproducir el MP4 y verificar calidad**

```bash
open tutorials/monitor/output.mp4
```

Verificar que:

- No hay frames en negro ni cortes bruscos entre escenas
- El texto del terminal es legible al tamaño de reproducción
- Las pausas de silencio en demos no se sienten vacías sino expectantes

- [ ] **Step 4: Commit final**

```bash
git add tutorials/monitor/config.json
git commit -m "feat(video): complete /monitor tutorial — 6 scenes, test + PR demos"
```

---

## Config completa de referencia

El `tutorials/monitor/config.json` final debe quedar así (para verificación):

```json
{
  "id": "monitor",
  "title": "/monitor — Deja de hacer polling",
  "description": "Como usar el Monitor tool de Claude Code para reaccionar a eventos en vez de hacer polling",
  "theme": "linea-directa",
  "fps": 30,
  "width": 1280,
  "height": 720,
  "scenes": [
    {
      "type": "intro",
      "title": "/monitor",
      "subtitle": "Deja de hacer polling, empieza a reaccionar",
      "durationInSeconds": 4
    },
    {
      "type": "terminal",
      "title": "El problema con /loop",
      "lines": [
        { "kind": "command", "text": "/loop 2m \"avisa si falla algun test\"" },
        { "kind": "blank", "text": "" },
        { "kind": "output", "text": "[llamada 1/4 — sin fallos]" },
        { "kind": "output", "text": "[llamada 2/4 — sin fallos]" },
        { "kind": "output", "text": "[llamada 3/4 — sin fallos]" },
        { "kind": "output", "text": "[llamada 4/4 — FALLO detectado]", "delayAfterMs": 600 },
        { "kind": "blank", "text": "" },
        { "kind": "claude", "text": "3 llamadas API desperdiciadas antes de detectar el fallo." }
      ],
      "durationInSeconds": 10
    },
    {
      "type": "callout",
      "text": "Monitor lanza un proceso en background. Cada linea de stdout se convierte en un evento que despierta a Claude. Silencio = 0 tokens.",
      "position": "bottom",
      "background": "overlay",
      "durationInSeconds": 5
    },
    {
      "type": "terminal",
      "title": "Demo — Atrapa el primer fallo",
      "lines": [
        { "kind": "command", "text": "monitorea los tests, avisa si algo falla y abre el archivo" },
        { "kind": "blank", "text": "" },
        { "kind": "claude", "text": "Lanzo monitor sobre pytest filtrando FAILED y ERROR..." },
        { "kind": "output", "text": "[Monitor activo: pytest --tb=short | grep -E \"FAILED|ERROR\"]" },
        { "kind": "blank", "text": "", "delayAfterMs": 1200 },
        { "kind": "output", "text": "FAILED tests/api/test_auth.py::test_token_expiry" },
        { "kind": "blank", "text": "" },
        { "kind": "claude", "text": "Fallo en test_token_expiry. Abro el archivo y propongo el fix." }
      ],
      "durationInSeconds": 12
    },
    {
      "type": "terminal",
      "title": "Demo — Reacciona al review del PR",
      "lines": [
        { "kind": "command", "text": "avisa cuando llegue un review en el PR #142" },
        { "kind": "blank", "text": "" },
        { "kind": "claude", "text": "Lanzo monitor con polling cada 30s sobre el PR..." },
        { "kind": "output", "text": "[Monitor activo — polling gh pr view 142 cada 30s]" },
        { "kind": "blank", "text": "", "delayAfterMs": 1200 },
        { "kind": "output", "text": "NEW_REVIEW: \"Este endpoint necesita validacion de input\"" },
        { "kind": "blank", "text": "" },
        { "kind": "claude", "text": "Review recibido. Implemento la validacion ahora." }
      ],
      "durationInSeconds": 12
    },
    {
      "type": "outro",
      "title": "Monitor en Claude Code",
      "bullets": [
        "Monitor = eventos, no polling",
        "stdout → notificacion instantanea a Claude",
        "persistent: true para toda la sesion",
        "timeout_ms para procesos acotados"
      ],
      "durationInSeconds": 6
    }
  ]
}
```
