# FUTURE.md — Ideas y roadmap

Ideas discutidas durante el brainstorming del 2026-03-22 que no se han implementado todavía.

## Contexto

El repo empezó como generador de tutoriales de Claude Code y evolucionó a una plataforma de vídeo con múltiples composiciones. Cada tipo de vídeo es una composición Remotion + skill de Claude Code.

## Composiciones implementadas

- **ClaudeCodeTutorial** (1280×720) — tutoriales educativos con terminal simulada
- **ProductShort** (1080×1920) — shorts de marketing para Línea Directa

## Ideas pendientes

### Nuevos tipos de composición

- **Presentación / explainer** — formato horizontal, slides animadas para explicar conceptos (onboarding, producto, procesos internos). No terminal, sino diagramas, bullets y transiciones.
- **Social clip genérico** — formato cuadrado (1080×1080) para posts de redes sociales que no sean shorts. Carruseles animados, quotes, datos destacados.
- **Comparativa** — side-by-side de dos productos o antes/después. Útil para marketing y para tutoriales.

### Mejoras a composiciones existentes

- **Voiceover con ElevenLabs** — flag `--voiceover` ya definido en el schema de tutorial-generator pero no implementado. Generar narración TTS y sincronizar con escenas.
- **Transiciones entre escenas** — actualmente es corte directo. Usar `@remotion/transitions` para fades, wipes o slides.
- **Música de fondo** — añadir pista de audio con volumen bajo que se duck durante voiceover.

### Infraestructura

- **Catálogo web** — página estática (Astro o similar) que liste todos los vídeos generados con preview y metadatos del config.
- **CI/CD render** — GitHub Action que renderice automáticamente cuando se pushea un config.json nuevo.
- **Extraer shared/** — parcialmente hecho: `createCalculateMetadata` extraído a `src/utils/`, `MascotWatermark` componetizado. Pendiente: mover ThemeContext y PhoneMascot a `src/shared/` cuando haya una 3ª composición (cross-import entre ProductShort y ClaudeCodeTutorial aún existe).
- **Tests visuales** — snapshot testing con `@remotion/test` para detectar regresiones en los frames.

### Más productos Línea Directa

La skill `/short-ld` puede generar shorts para cualquier producto asegurable:
coche, moto, hogar, salud, movilidad personal, mascotas, autónomos/pymes, antiokupación.

### Otros clientes / marcas

La arquitectura de temas permite añadir más marcas. Cada marca sería un tema nuevo en `ThemeContext` con sus colores, tipografía y mascota/logo.
