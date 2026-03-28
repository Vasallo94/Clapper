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

### Video meta-educacional: "Cómo hicimos este repo con IA"

Video autoreferencial que documente el proceso de crear este mismo repositorio de generación de videos, mostrando cómo se ha construido todo mediante direcciones y conversaciones con agentes de IA. Cubriría desde la idea inicial hasta las composiciones, skills, el modelo de dirección editorial, y cómo cada feature nació de un prompt. Formato educacional para LinkedIn mostrando el workflow real humano-agente.

### Mejoras a composiciones existentes

- **Voiceover con ElevenLabs** — flag `--voiceover` ya definido en el schema de tutorial-generator pero no implementado. Generar narración TTS y sincronizar con escenas.
- **Transiciones entre escenas** — actualmente es corte directo. Usar `@remotion/transitions` para fades, wipes o slides.
- **Música de fondo** — añadir pista de audio con volumen bajo que se duck durante voiceover.
- **Pixel logo hero variant** — crear una segunda versión del sprite del logo en `96x144`, con limpieza manual adicional en barba, humo y gafas para planos grandes o intros de marca.
- **Animación de humo real en pixel art (GIF sprite sheet)** — el humo del logo debe moverse orgánicamente como un GIF de pixel art real: crear varios frames del sprite con el humo en distintas posiciones/formas y ciclarlos. No superponer partículas encima del logo estático. Approach: diseñar 4-6 frames de humo en el propio sprite `64×96`, exportar como sprite sheet, y reproducirlos con `useCurrentFrame()` + frame hold. (2026-03-28)

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
