# Project Specs

Spec-Driven Development: definir antes de construir.

## Estructura

- `features/` — Specs de features pendientes con criterios de aceptación y casos de test
- `completed.md` — Specs completadas (movidas desde features/, no borradas)

## Formato de spec

```markdown
# [Feature Name]

## Descripción

Qué hace y por qué.

## Criterios de aceptación

- [ ] Criterio 1 (medible)
- [ ] Criterio 2 (medible)

## Casos de test

- Input X → Output Y
- Edge case Z → Comportamiento esperado

## Notas de implementación

Restricciones, dependencias, decisiones.
```
