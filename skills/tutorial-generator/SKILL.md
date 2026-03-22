---
name: tutorial-generator
description: Genera vídeos educativos de Claude Code features usando Remotion. Invoca con /tutorial-generator "instrucción" [--voiceover] [--no-demo]
---

# Tutorial Generator

Genera un vídeo MP4 educativo sobre una feature de Claude Code con terminal simulada.

## Cuando se te invoca

El usuario te pasa una instrucción en lenguaje natural. Puede incluir:
- Un tema: `/tutorial-generator "explica /compact"`
- Una URL de referencia + tema: `/tutorial-generator "https://docs.anthropic.com/..." "explica esta feature"`
- Flags: `--voiceover` (activa ElevenLabs TTS, no implementado aún), `--no-demo` (omite el subagente de demostración)

## Reglas de parsing

- Si el primer argumento empieza por `https?://`, es una URL de referencia; el resto es el tema.
- Genera un slug limpio del tema: minúsculas, sin espacios, sin caracteres especiales. Ejemplo: "comando /compact" → `compact-command`.
- Crea la carpeta `tutorials/[slug]/` y `tutorials/[slug]/assets/`.

## Paso 1: Research

Lanza en paralelo:
- **Context7 MCP** → busca la feature en documentación de Claude Code / Anthropic
- **WebSearch** → busca ejemplos, posts, guías relacionadas
- **WebFetch** → si se pasó una URL, léela directamente

Lee también `skills/remotion-best-practices/` para entender qué tipos de escenas y efectos puedes usar en el template.

## Paso 2: Demo subagente (por defecto activo, omitir con --no-demo)

Lanza un subagente con esta instrucción exacta:

> "Eres un agente de demostración. Documenta el uso real de esta feature de Claude Code: [tema].
> Responde SOLO con este formato:
> COMANDOS EXACTOS: [lista de comandos, uno por línea]
> OUTPUT REAL: [output literal que produce la herramienta, tal como aparece en la terminal]
> CASOS DE USO: [2-3 situaciones donde es útil]
> ERRORES COMUNES: [1-2 errores típicos del usuario]
> NOTAS: [cualquier comportamiento inesperado o matiz importante]"

Usa la respuesta estructurada del subagente como fuente de verdad para los comandos y outputs del tutorial.

## Paso 3: Genera config.json

Con toda la información recopilada, escribe `tutorials/[slug]/config.json`.

El JSON debe ser válido según el schema en `src/compositions/ClaudeCodeTutorial/schema.ts`.

### Estructura mínima de un buen tutorial:
1. `intro` (3-5s): título llamativo que explique qué va a aprender el usuario
2. `terminal` (6-15s): demostración real del comando con líneas de tipo command, output, claude
3. `callout` (3-5s): explicación del "por qué" o "cuándo usar" en lenguaje natural
4. `outro` (4-8s): resumen con bullets accionables

### Reglas para el tipo "terminal":
- `kind: "command"` → lo que escribe el usuario (usa los comandos exactos del subagente)
- `kind: "output"` → respuesta inmediata del sistema (aparece instantánea)
- `kind: "claude"` → respuesta de Claude (aparece como streaming)
- `kind: "blank"` → separador visual entre grupos de líneas
- Usa `delayAfterMs` para pausas dramáticas (ej: 800ms antes de que aparezca el output)

### Si necesitas una escena custom (escape hatch):
1. Escribe el componente React en `src/compositions/ClaudeCodeTutorial/scenes/custom/[NombreComponente].tsx`
2. Añade el import y la entrada en `src/compositions/ClaudeCodeTutorial/customSceneRegistry.ts`
3. Referencia en config.json con `"type": "custom", "componentId": "nombre-componente"`
4. IMPORTANTE: Todas las animaciones deben derivar de `useCurrentFrame()`. Nunca CSS transitions.

## Paso 4: Renderizar

Ejecuta:

```bash
npx tsx scripts/render.ts tutorials/[slug]/config.json
```

Si falla con error de browser/Chromium:
```bash
npx remotion browser ensure
npx tsx scripts/render.ts tutorials/[slug]/config.json
```

## Paso 5: Resumen

Informa al usuario:
- Escenas generadas (tipos y duraciones)
- Duración total del vídeo
- Ruta: `tutorials/[slug]/output.mp4`
- Ofrece ajustes si quiere cambiar algo

## Notas importantes

- **NUNCA uses CSS transitions o clases de animación de Tailwind** en los componentes React.
- **Todas las animaciones deben derivar de `useCurrentFrame()`** via `spring()` o `interpolate()`.
- El `config.json` es el source of truth. Si el usuario quiere ajustes, edita el JSON y re-renderiza.
- Los vídeos se guardan en `tutorials/[slug]/output.mp4` (gitignored). Los `config.json` sí se commitean.
- El render script usa `async function main()` — no modificar esto.
