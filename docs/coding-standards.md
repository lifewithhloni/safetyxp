# SafetyXP coding standards

## General rules
- Prefer TypeScript over JavaScript.
- Keep components small, composable, and reusable.
- Use shared UI primitives before introducing one-off styles.
- Avoid hard-coded color values in component markup.
- Keep business logic in services, not in page components.

## Styling
- Use CSS variables and design tokens for colors, spacing, radii, shadows, and motion.
- Prefer semantic utility classes and shared component wrappers.
- Keep the UI visually stable while refactoring internals.

## File organization
- app/ for routes
- components/ for UI building blocks
- features/ for feature-level composition
- services/ for domain logic
- types/ for shared contracts
- constants/ for centralized configuration

## Review checklist
- Does the change improve reuse?
- Does it preserve the current experience?
- Is the logic isolated in a service or provider?
- Is the implementation ready for future Supabase integration?
