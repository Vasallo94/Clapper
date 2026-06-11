# «Hola, soy Claqueta» — vídeo meta de presentación

**Fecha:** 2026-06-12
**Estado:** Aprobado (escaleta validada por el humano en sesión de brainstorming)

## Concepto

Claqueta se presenta a sí misma en primera persona (voz TTS femenina, español). El vídeo abre y cierra con una claqueta de cine — el nombre ya es cinematográfico — y el giro final revela que todo lo visto (config, escenas, voz) salió de su propio pipeline. El cierre del bloque "qué puedes pedirme" presenta el nuevo modo `self_improve` (PR #13).

**Formato:** tutorial landscape LinkedIn, `ClaudeCodeTutorial` 1280×720, ~2:30 min.
**Audio:** pipeline completo — voiceover Gemini TTS + música de librería + SFX.
**Slug:** `content/tutorials/claqueta-se-presenta/config.json`.

## Tema visual nuevo: `claqueta`

Estética "sala de cine / proyector", distinta de los 4 temas existentes:

- Fondo negro proyector `#0D0C0B`; nada del verde hacker del `default`.
- Acento ámbar tungsteno `#FFB347` (luz de proyector) + crema `#F5EFE0` para texto.
- Barras letterbox sutiles arriba/abajo en escenas hero.
- Tipografía: display/serif para títulos (créditos de cine), mono para datos técnicos.
- Se registra en `src/shared/themes/themes.ts` como `"claqueta"` implementando `ThemeTokens` completo (incluye `terminal.*`, `card.*`, `mascot.show: false`).

## Escenas custom nuevas (2)

1. **`ClapperboardScene`** (`componentId: "clapperboard"`): film leader con countdown (3-2-1), claqueta SVG que entra y cierra con golpe (frame exacto expuesto para sincronizar SFX), texto configurable (título/subtítulo/modo "corten" con scroll fugaz de un config.json). Animación 100% `useCurrentFrame()` + `spring()`.
2. **`CrewCreditsScene`** (`componentId: "crew-credits"`): créditos de cine rodando verticalmente — REPARTO con los subagentes (Investigadora, Guionista, Directora, Sonidista, Locutora, Escenógrafa, Control de calidad, Validadora, Crítica) y cierre "PRODUCE: un orquestador con Gemini". Velocidad de scroll ligada a la duración de la escena.

Ambas se registran en `customSceneRegistry.ts` (import estático).

## Escaleta aprobada (~2:30)

| #   | Tiempo    | Escena                                | VO (literal, primera persona)                                                                                                                                                                                                                                                                                        |
| --- | --------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | 0:00–0:12 | `clapperboard` 🆕                     | «¡Acción! Hola — soy Claqueta. Y antes de que preguntes: sí, este vídeo lo estoy haciendo yo misma. Deja que me explique.»                                                                                                                                                                                           |
| E2  | 0:12–0:35 | `flow-diagram`                        | «Soy un pipeline de vídeo automatizado. Tú me escribes en un chat lo que quieres contar; yo lo investigo, escribo el guion, dirijo las escenas, pongo la voz y la música, y lo renderizo fotograma a fotograma con React. De una frase tuya a un MP4 terminado.»                                                     |
| E3  | 0:35–1:05 | `crew-credits` 🆕                     | «Por dentro soy un equipo de rodaje completo: una investigadora que documenta el tema, una guionista que escribe la escaleta, una directora que decide cada plano, una sonidista, una locutora… y un orquestador que los coordina a todos. Tres servicios en Docker: el chat, el cerebro, y la sala de renderizado.» |
| E4  | 1:05–1:35 | `terminal`                            | «Usarme es una conversación. Me pides un vídeo; yo te propongo la escaleta y espero. Porque mi regla de oro es: yo automatizo la ejecución, nunca el criterio. Tú apruebas el guion, tú apruebas el sonido. Cuando dices que sí, el resto es mío.»                                                                   |
| E5  | 1:35–2:05 | `icon-grid`                           | «Puedes pedirme un tutorial desde cero, retocar un vídeo que ya existe, sacar una variante, regenerar solo la voz… Y desde esta semana, algo más: cuando algo me hace tropezar, lo apunto. Y si me lo pides, me arreglo yo misma — y te abro un pull request para que tú decidas si el cambio entra.»                |
| E6  | 2:05–2:30 | `clapperboard` 🆕 (modo corten) + CTA | «¿Y este vídeo? Su guion, sus escenas, esta voz que escuchas: todo salió de mi pipeline. Un humano solo aprobó la escaleta — como debe ser. Soy Claqueta. ¿Qué quieres rodar? …Corten.»                                                                                                                              |

Detalles de dirección:

- E1: golpe de claqueta sincronizado con SFX seco; el VO arranca justo tras el golpe.
- E2: partículas de luz (`flow-diagram` ya soporta `light` desde el vídeo Hα) recorriendo chat → agente → render → MP4.
- E4: sesión de terminal simulada: petición «Hazme un short sobre eclipses» → escaleta propuesta → checkpoint de aprobación visible → «render OK».
- E5: seis tarjetas; la sexta («Mejorarme a mí misma») entra la última con énfasis.
- E6: scroll fugaz del config.json real de este vídeo antes del cierre; claqueta cierra y corte a negro.
- Música: pista de librería cálida/cinemática a volumen bajo bajo todo el VO; sube en E6 final.

## Criterios de aceptación

- [ ] Tema `claqueta` registrado en `themes.ts` con `ThemeTokens` completo y sin romper los temas existentes (lint + tsc verdes).
- [ ] `ClapperboardScene` y `CrewCreditsScene` registradas en `customSceneRegistry.ts`, animadas solo con `useCurrentFrame()`/`spring()`/`interpolate()` (sin CSS animations).
- [ ] `content/tutorials/claqueta-se-presenta/config.json` valida contra el schema Zod y usa `theme: "claqueta"` (excepción al default LD aprobada explícitamente por el humano en esta spec).
- [ ] Voiceover TTS generado por escena en `public/voiceover/claqueta-se-presenta/`; duraciones de escena ajustadas a los MP3 reales.
- [ ] Música + SFX (golpe de claqueta en E1 y E6) desde la librería en `public/audio/`.
- [ ] Render completo a MP4 sin errores vía `scripts/render.ts`.
- [ ] El VO de la escaleta se respeta literalmente (es el guion aprobado).

## Fuera de alcance

- Short vertical derivado (posible variante futura).
- Mascota/logo nuevo para Claqueta.
- Cambios en otros temas o escenas existentes.
