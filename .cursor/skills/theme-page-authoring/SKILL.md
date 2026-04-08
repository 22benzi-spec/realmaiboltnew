---
name: theme-page-authoring
description: Enforces the project UI theme when creating or updating Vue pages, components, layout styles, CSS, scoped styles, Ant Design Vue visual tokens, or page color usage. Use when the task involves page UI, styling, visual polish, theme consistency, colors, backgrounds, borders, badges, sidebars, or status colors.
---

# Theme Page Authoring

Use this skill whenever you create or modify page-level UI, component styles, or visual states in this repository.

## Source Of Truth

- Read `theme-reference.md` in this skill before choosing colors.
- Treat `THEME.md` in the repo root as the ultimate source of truth if there is any mismatch.

## Rules

1. Do not invent a new primary color for pages, buttons, links, active states, sidebars, badges, or backgrounds unless the user explicitly asks for a theme change.
2. Reuse the theme colors and roles from `theme-reference.md`.
3. Prefer updating touched code to match the theme rather than introducing nearby one-off hardcoded colors.
4. If a file already contains many legacy hardcoded colors outside the edited area, do not do a broad restyle unless the user asked for it. Keep your changes localized but theme-aligned.
5. When using Ant Design Vue visual tokens, keep `colorPrimary` aligned with the theme primary color.
6. Keep contrast readable: primary text uses the theme text color, secondary text uses the muted text color, borders use theme border colors, and danger/success/warning states use the mapped status colors.

## Styling Workflow

1. Identify whether the change affects page background, text, sidebar, nav active state, status state, badge, border, scrollbar, or Ant Design token.
2. Pick the matching color from `theme-reference.md` instead of introducing a new value.
3. If no exact token exists, choose the closest existing role-based color and note that choice briefly in the response.
4. Before finishing, scan the edited snippet for accidental off-theme colors such as unrelated blues or arbitrary grays.

## Defaults

- Page background: use the theme page background.
- Main text: use the theme primary text color.
- Secondary text: use the theme muted text color.
- Borders: use the theme border colors.
- Interactive primary states: use the theme primary color.
- Sidebar and logo areas: follow the sidebar background, active background, active text, and logo gradient from the theme.
- Role badges and business states: use the mapped badge/status colors from the theme.

## When Not To Apply

- Pure logic, data fetching, or refactoring tasks with no UI or style changes.
- Cases where the user explicitly asks for a deliberate theme departure.

## Additional Resource

- Read [theme-reference.md](theme-reference.md) for the palette and mappings.
