---
status: accepted
date: 2026-03-28
deciders: [Enrique Vasallo]
consulted: [Codex]
informed: []
---

# 0002 - Modelo editorial y de sincronía embebido en config.json

## Contexto y problema

Los vídeos generados por el pipeline actual sincronizan su duración global con el audio, pero siguen siendo demasiado escena-bloque. Falta una capa explícita de dirección que describa intención, ritmo y anclajes entre voz y visual.

## Drivers de decisión

- El `config.json` ya es la fuente de verdad del sistema
- Se necesita compatibilidad con configs existentes
- El modelo debe servir tanto a tutoriales como a shorts
- Las skills deben poder generar borradores y luego rematarlos con un pass de dirección

## Opciones consideradas

### Opción A: Mantener configs simples y guardar la dirección en un archivo aparte

- Pro: Separación conceptual clara
- Contra: Duplicaría la fuente de verdad
- Riesgo: Deriva entre guion, timing y escenas

### Opción B: Añadir dirección dentro del `config.json`

- Pro: Mantiene una única fuente de verdad
- Pro: Permite que el runtime use los mismos datos que usan las skills
- Contra: El config gana complejidad
- Riesgo: Que algunas escenas no adopten el modelo en v1

### Opción C: Resolver todo con heurísticas en runtime sin expresarlo en config

- Pro: Menos cambios en schemas
- Contra: Poco control editorial
- Riesgo: Los vídeos siguen sintiéndose genéricos o atropellados

## Decisión

Se adopta la opción B. El modelo editorial vive dentro del `config.json` mediante `brief`, `timing` y `beats`. Las skills generadoras crean un draft y una nueva skill `remotion-director` lo refina dentro del mismo artefacto.

## Consecuencias

- Positivas: Más control narrativo, mejor sincronía y trazabilidad clara entre guion y visual
- Negativas: Los schemas y componentes ganan complejidad
- Deuda técnica generada: Algunas escenas solo usarán el modelo parcialmente en la primera versión

## Validación

- El runtime respeta offsets de audio y duraciones dirigidas
- `claude-code-memory` mejora su opening y sincronía interna
- Los configs legacy siguen funcionando
