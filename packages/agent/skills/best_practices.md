# Remotion Best Practices

## Critical rules

1. All animations must use `useCurrentFrame()` + `spring()` / `interpolate()`. CSS transitions and Tailwind animation classes do not work (Remotion renders frame-by-frame).
2. Use `<Img>` from remotion, not `<img>`, for images.
3. Use `staticFile()` for assets in `public/`.
4. Never use `useEffect` for animations — derive everything from frame number.
5. Use `useThemeTokens()` for all colors — never hardcode or check theme name.
6. Use `useSlideIn()` hook for entrance animations instead of manual spring+interpolate.
7. Every scene MUST have `durationInSeconds` (not durationInFrames).
8. Scene components accept props matching their Zod schema type.
