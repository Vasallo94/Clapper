---
title: "Video spec — /monitor: Deja de hacer polling"
date: 2026-04-12
status: approved
---

# Video spec — `/monitor`: Deja de hacer polling

## Objetivo

Tutorial de LinkedIn sobre el comando Monitor de Claude Code (lanzado 9 abril 2026). Enfoque: uso práctico con la mecánica mínima para entender por qué funciona mejor que `/loop`. Audiencia: desarrolladores que ya usan Claude Code y quieren sacarle más partido.

## Estructura general

6 escenas, formato landscape 1280×720, tema `linea-directa`, 30fps.

| #   | Tipo       | Título                                      |
| --- | ---------- | ------------------------------------------- |
| 1   | `intro`    | `/monitor` — Deja de hacer polling          |
| 2   | `terminal` | El problema: /loop desperdicia tokens       |
| 3   | `callout`  | Cómo funciona Monitor                       |
| 4   | `terminal` | Demo 1 — Test suite: atrapa el primer fallo |
| 5   | `terminal` | Demo 2 — PR polling: reacciona al review    |
| 6   | `outro`    | Resumen                                     |

## Guion detallado por escena

### Escena 1 — Intro

- **Título:** `/monitor`
- **Subtítulo:** `Deja de hacer polling, empieza a reaccionar`

### Escena 2 — Terminal: El problema con /loop

- **Título:** `El problema con /loop`
- **Narrativa:** Mostrar a Claude repitiendo la misma comprobación cada 2 minutos, con 3 llamadas inútiles antes de detectar el fallo.

**Líneas de terminal:**

```
command:  /loop 2m "¿falló algún test?"
claude:   Comprobando tests...
output:   [llamada 1 — sin fallos]
claude:   Comprobando tests...
output:   [llamada 2 — sin fallos]
claude:   Comprobando tests...
output:   [llamada 3 — sin fallos]
claude:   Comprobando tests...
output:   [llamada 4 — FALLO detectado]
```

**Callout en overlay:** `4 llamadas API. 3 inútiles. Monitor resuelve esto con 0 tokens hasta que algo pasa.`

### Escena 3 — Callout: mecánica de Monitor

> Monitor lanza un proceso en background. Cada línea de stdout se convierte en un evento que despierta a Claude. Silencio = 0 tokens.

### Escena 4 — Terminal: Demo 1 — Test suite

- **Título:** `Atrapa el primer fallo`
- **Narrativa:** Claude lanza un monitor sobre pytest filtrado por FAILED/ERROR. Silencio mientras corren los tests. Al detectar el fallo, Claude abre el archivo afectado y propone un fix.

**Líneas de terminal:**

```
command:  Monitorea la suite de tests. Si algo falla, dime qué y abre el archivo.
[blank]
claude:   Lanzo monitor sobre pytest filtrando FAILED y ERROR...
output:   [Monitor activo: pytest --tb=short | grep -E "FAILED|ERROR"]
[blank — silencio mientras corren los tests]
output:   FAILED tests/api/test_auth.py::test_token_expiry
[blank]
claude:   Veo un fallo en test_token_expiry. Abriendo el archivo...
claude:   El token no se invalida al expirar. Propongo el fix.
```

### Escena 5 — Terminal: Demo 2 — PR polling

- **Título:** `Reacciona cuando llega el review`
- **Narrativa:** Claude lanza un monitor de polling sobre un PR de GitHub. Silencio hasta que llega un nuevo comentario de review. Al recibirlo, Claude lee el feedback e implementa el cambio directamente.

**Líneas de terminal:**

```
command:  Avísame cuando llegue un comentario de review en el PR #142.
[blank]
claude:   Lanzo monitor con polling cada 30s sobre el PR...
output:   [Monitor activo: gh pr view 142 --json reviews | poll 30s]
[blank — silencio]
output:   NEW_REVIEW: "Este endpoint necesita validación de input"
[blank]
claude:   Review recibido. El reviewer pide validación en el endpoint.
claude:   Implementando validación de input ahora.
```

### Escena 6 — Outro

**Bullets:**

- `Monitor = eventos, no polling`
- `stdout → notificación instantánea a Claude`
- `persistent: true para toda la sesión`
- `timeout_ms para procesos acotados`

## Parámetros técnicos clave a mencionar

| Parámetro          | Uso                                                  |
| ------------------ | ---------------------------------------------------- |
| `command`          | Script cuyo stdout genera los eventos                |
| `persistent: true` | Monitor vive toda la sesión (dev server, log tailer) |
| `timeout_ms`       | Auto-kill tras N ms (default 300.000 = 5 min)        |
| `description`      | Label para identificar el monitor en notificaciones  |

## Criterios de aceptación

- [ ] La escena 2 deja claro el problema de polling antes de introducir Monitor
- [ ] La escena 3 explica la mecánica en una sola frase memorable
- [ ] Las demos 1 y 2 muestran el silencio previo al evento (sensación de "waiting")
- [ ] El outro menciona `persistent` y `timeout_ms` como parámetros clave
- [ ] Config JSON usa tema `linea-directa` y no contiene emojis en los textos del terminal
