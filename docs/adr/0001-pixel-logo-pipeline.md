---
status: accepted
date: 2026-03-28
deciders: [Enrique Vasallo]
consulted: [Codex]
informed: []
---

# 0001 - Pipeline de logo pixel art basado en mapa tipado

## Contexto y problema

El proyecto necesita incorporar un logo ilustrado dentro de los vídeos con una estética de pixel art animable. El asset original es un PNG detallado, demasiado complejo para usarlo directamente como sprite sin simplificación.

## Drivers de decisión

- El sprite debe ser reutilizable entre vídeos
- Tiene que poder animarse frame a frame en Remotion
- El resultado debe ser editable manualmente si hace falta refinar el pixel art
- El pipeline no debe depender de herramientas gráficas externas para cada iteración

## Opciones consideradas

### Opción A: Usar el PNG original con un filtro de pixelado en runtime

- Pro: Implementación rápida
- Contra: No produce pixel art real, solo degradación visual
- Riesgo: Baja legibilidad y poco control sobre animaciones

### Opción B: Generar un sprite raster final y animarlo como imagen

- Pro: Menos coste de render en React
- Contra: Peor editabilidad y menos control por píxel
- Riesgo: Cada cambio obliga a regenerar assets finales

### Opción C: Generar un mapa de píxeles tipado desde el PNG y renderizarlo en React

- Pro: Editable, trazable y animable dentro del sistema actual
- Pro: Permite mezclar automatización con retoque manual posterior
- Contra: Requiere un paso de generación inicial
- Riesgo: La primera versión automática puede necesitar simplificación adicional

## Decisión

Se adopta la opción C. El PNG fuente se conserva como asset, un script genera un mapa de píxeles tipado y un componente React lo renderiza como sprite reutilizable en Remotion.

## Consecuencias

- Positivas: Más control visual, mejor base para animaciones y futuras iteraciones
- Negativas: Se añade un pequeño pipeline de generación
- Deuda técnica generada: Posible refinado manual futuro del mapa para una versión todavía más “arcade”

## Validación

- El script genera el mapa y un preview SVG
- La composición de preview renderiza correctamente el sprite
- `npm run lint` pasa sin errores
