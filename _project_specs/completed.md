# Specs completadas

Specs movidas aquí tras implementación exitosa.

---

## 2026-03-28 — Claude Code Memory V2

### Objective

Crear una V2 del tutorial `claude-code-memory` con mejor ritmo, mayor claridad visual y una propuesta más adecuada para consumo rápido en LinkedIn.

### Scope

- Reescribir la narrativa del vídeo para reducir su duración total.
- Mejorar la jerarquía visual de las escenas más densas.
- Mantener la identidad visual personal del tutorial mientras se mejora el ritmo y la claridad.
- Mantener el tutorial dentro del sistema actual de composiciones y escenas reutilizables.

### Acceptance Criteria

1. La duración total del tutorial queda por debajo de 100 segundos.
2. El hook inicial comunica el beneficio principal en menos de 6 segundos.
3. La escena de terminal y las escenas de memoria muestran menos texto por pantalla que la versión anterior.
4. El bloque de los tres sistemas muestra relaciones visuales entre conceptos.
5. Auto Dream deja de ser el bloque dominante del vídeo y pasa a ser una explicación breve y clara.
6. El cierre tiene una CTA más clara que la versión anterior.
7. El config sigue validando con el esquema actual y la composición renderiza sin cambios estructurales fuera del sistema existente.

### Test Cases

1. Ejecutar `npm run lint` sin errores.
2. Renderizar fotogramas representativos del tutorial y comprobar:
   - legibilidad del hook
   - legibilidad de terminal
   - claridad del file explorer
   - conexión visual en el diagrama de 3 bloques
   - cierre con CTA clara
3. Verificar que el `config.json` actualizado reduce la duración total esperada.

---

## 2026-03-28 — Pixel Logo Map

### Objective

Convertir un logo raster a un mapa de píxeles reutilizable para Remotion, con una estética más cercana a pixel art tradicional que a un simple pixelado automático.

### Scope

- Incorporar el logo fuente al repositorio como asset reutilizable.
- Generar un mapa de píxeles serializable y editable desde TypeScript.
- Crear un componente de Remotion que pinte el sprite y soporte animaciones básicas.
- Añadir una composición de preview para validar el resultado visual.

### Acceptance Criteria

1. Existe un asset fuente accesible desde el proyecto.
2. Existe un mapa de píxeles tipado exportado desde `src`.
3. El mapa usa una paleta cerrada con transparencia y varios niveles de gris.
4. Existe un componente reutilizable que renderiza el logo como pixel art.
5. Existe una composición de preview que permite inspeccionar el sprite en Remotion Studio.
6. `npm run lint` pasa sin errores.

### Test Cases

1. Ejecutar `npm run lint`.
2. Ejecutar el script generador y verificar que produce el mapa y un preview SVG.
3. Abrir la composición de preview y comprobar que:
   - el logo mantiene la silueta principal
   - se lee como pixel art y no como imagen degradada
   - las animaciones básicas funcionan sin artefactos

---

## 2026-03-28 — Pixel Logo Video Integration

### Objective

Integrar el logo en pixel art dentro del tutorial `claude-code-memory` como una primera prueba visual dentro del vídeo final.

### Scope

- Extender el esquema del tutorial para permitir un logo pixel opcional en escenas compatibles.
- Integrar el logo en la escena de intro con animación sutil.
- Activar la integración en `tutorials/claude-code-memory/config.json`.

### Acceptance Criteria

1. La escena de intro puede renderizar opcionalmente el logo pixel art.
2. La configuración del tutorial de memoria activa esa opción.
3. El logo aparece integrado sin tapar título ni subtítulo.
4. `npm run lint` pasa sin errores.

### Test Cases

1. Ejecutar `npm run lint`.
2. Renderizar un still del tutorial y comprobar que el intro muestra:
   - logo visible
   - composición equilibrada
   - texto legible

---

## 2026-03-28 — Editorial Direction Sync

### Objective

Añadir una capa de dirección editorial y sincronía entre guion, audio y animación para que los vídeos tengan mejor ritmo, intención narrativa y respiración visual.

### Scope

- Definir un modelo compartido de `brief`, `timing` y `beats` dentro del `config.json`.
- Mantener compatibilidad hacia atrás con configs existentes.
- Actualizar runtime para respetar delays de audio y duraciones dirigidas.
- Introducir utilidades comunes para trabajar con milisegundos, beats y offsets.
- Aplicar la primera adopción en `claude-code-memory`.
- Crear una nueva skill `remotion-director` y actualizar las skills generadoras existentes.

### Acceptance Criteria

1. `ClaudeCodeTutorial` y `ProductShort` aceptan `brief`, `timing` y `beats` en schema.
2. `voiceover.scenes` acepta tanto string legacy como objeto con `text` y timing opcional.
3. El runtime calcula duración por escena usando lead-in, delay de audio y tail hold cuando existen.
4. El audio puede empezar más tarde que el frame 0 de la escena.
5. `claude-code-memory` usa el nuevo sistema en intro, outro y al menos una escena central.
6. Existe una skill `remotion-director` documentada y las skills generadoras la integran en su flujo.
7. Los configs antiguos siguen validando y renderizando.

### Test Cases

1. Ejecutar `npm run lint`.
2. Renderizar un still del intro de `claude-code-memory` y comprobar pausa inicial + logo + título antes de la voz.
3. Renderizar el vídeo completo `tutorials/claude-code-memory/output.mp4`.
4. Validar un still de `ProductShort` con timing compatible en runtime.
5. Verificar que un config legacy sin `brief`, `timing` ni `beats` sigue seleccionando composición sin error.

---

## 2026-03-28 — Terminal Pacing and ElevenLabs Controls

### Objective

Hacer que las escenas de terminal pierdan menos tiempo en typing lento y exponer controles útiles de ElevenLabs directamente en `config.json` para afinar la locución desde el propio guion.

### Scope

- Acelerar el streaming de Claude/Codex respecto al typing humano en `TerminalScene`.
- Mantener compatibilidad con escenas terminal existentes.
- Extender el schema de `voiceover` con opciones globales y overrides por escena para ElevenLabs.
- Hacer que el script de generación de voz use esos parámetros.
- Actualizar las skills para documentar el uso correcto de ElevenLabs y el nuevo pacing del terminal.

### Acceptance Criteria

1. Las líneas `claude` se renderizan más rápido que las líneas `command`.
2. Los configs existentes de terminal siguen funcionando sin cambios.
3. `voiceover.elevenlabs` acepta ajustes globales útiles y `voiceover.scenes[n].elevenlabs` acepta overrides.
4. El script de voiceover convierte esos ajustes al payload real de ElevenLabs.
5. Las skills y reglas internas reflejan el comportamiento nuevo.

### Test Cases

1. Ejecutar `npm run lint`.
2. Verificar que un config legacy con strings en `voiceover.scenes` sigue validando.
3. Verificar que un config con `provider: "elevenlabs"` y sin overrides sigue generando usando defaults razonables.
