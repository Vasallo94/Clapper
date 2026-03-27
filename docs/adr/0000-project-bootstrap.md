---
status: accepted
date: 2026-03-27
deciders: [Enrique Vasallo]
consulted: [Claude Code (delafu-mode bootstrap)]
informed: []
---

# 0000 - Enterprise Bootstrap del proyecto

## Contexto y problema

El repositorio `remotion-playground` ha crecido orgánicamente como pipeline de generación de video con Remotion. Tiene buenas prácticas parciales (Conventional Commits al 98.6%, TypeScript strict, Zod validation) pero carece de enforcement formal, tests, CI/CD y documentación de decisiones arquitectónicas.

## Drivers de decisión

- El proyecto se usa para producir contenido público (LinkedIn)
- Trabaja una persona pero con agentes IA como copiloto
- Necesita trazabilidad para mantener calidad a medida que crece
- No debe ralentizar la velocidad de iteración actual

## Opciones consideradas

### Opción A: Bootstrap completo (A-G)

- Pro: Gobierno técnico completo desde el inicio
- Pro: Pre-commit hooks previenen regresiones
- Contra: Setup inicial requiere tiempo
- Riesgo: Overhead excesivo para proyecto personal (probabilidad baja)

### Opción B: Solo documentación (A-C)

- Pro: Mínima fricción
- Contra: Sin enforcement automático
- Riesgo: Las reglas se ignoran bajo presión

## Decisión

Opción A: Bootstrap completo. El overhead es mínimo una vez configurado y los pre-commit hooks son una red de seguridad valiosa cuando se trabaja con agentes IA que generan código a alta velocidad.

## Consecuencias

- Positivas: Lint + format + commit validation automáticos, trazabilidad, ADRs
- Negativas: Commits tardan ~2s más por los hooks
- Deuda técnica generada: Ninguna

## Validación

- Pre-commit hooks pasan en cada commit
- CHANGELOG.md se mantiene actualizado
- Conventional Commits enforced al 100%
