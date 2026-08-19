# QRL Ecosystem Index design foundation

This document is the source of truth for typography and spacing across the
website. It keeps the existing visual identity while limiting new work to a
small, predictable set of roles and values. The tokens below must match
`website/assets/scss/main.scss`.

## Principles

- Use semantic roles instead of choosing a new size or gap for each component.
- Preserve hierarchy with type family, weight, and spacing before adding
  another font size.
- Use the major section interval for page-level transitions and the compact
  interval for sections within a shared article, guide, or project page.
- Keep component padding consistent across components with the same purpose.
- Let the fluid type and section tokens handle responsive scaling. Avoid
  breakpoint-only overrides unless the layout itself changes.

## Typography

Inter is the display face for titles and statistics. DM Sans is the body and UI
face. IBM Plex Mono is reserved for code and other machine-readable values.

### Size scale

| Token | Value | Primary use |
| --- | --- | --- |
| `--text-xs` | `0.75rem` | Labels, metadata, captions |
| `--text-sm` | `0.875rem` | Small copy, actions, controls |
| `--text-body` | `1rem` | Default body copy |
| `--text-lead` | `clamp(1.125rem, 1.5vw, 1.3125rem)` | Introductions and summaries |
| `--text-title-sm` | `clamp(1.5rem, 2.2vw, 2rem)` | Card and tertiary titles |
| `--text-title-md` | `clamp(1.75rem, 3vw, 2.5rem)` | Subsection and panel titles |
| `--text-title-lg` | `clamp(2.25rem, 4.2vw, 3.5rem)` | Major section titles |
| `--text-title-xl` | `clamp(3rem, 6vw, 4.5rem)` | Page and hero titles |
| `--text-display` | `clamp(3.75rem, 8vw, 7rem)` | Guide markers and display numerals |

### Roles

| Role | Family | Size | Weight | Line height and tracking |
| --- | --- | --- | --- | --- |
| Page title | Inter | `title-xl` | 700 | `1.08`, `-0.035em` |
| Section title | Inter | `title-lg` | 700 | `1.08`, `-0.035em` |
| Subsection title | Inter | `title-md` | 700 | `1.08`, `-0.035em` |
| Card title | Inter | `title-sm` | 700 | `1.08`, `-0.035em` |
| Statistic/display numeral | Inter | Role-appropriate title or display size | 600 | `1`, tight tracking when large |
| Lead | DM Sans | `lead` | 400 | `1.6` or `1.7` in long-form copy |
| Body | DM Sans | `body` | 400 | `1.6`; `1.7` for prose |
| Small copy | DM Sans | `sm` | 400 | `1.6` |
| Action | DM Sans | `sm` | 700 | `1.3` or tighter in controls |
| Label/eyebrow | DM Sans | `xs` | 600 | `1.3`, `0.06em`, uppercase |
| Caption | DM Sans | `xs` | 400 | `1.3` |

Do not introduce literal content font sizes. Literal sizes are allowed for icon
glyphs because they are sized as graphics rather than text.

## Spacing

The primitive scale is based on 4px at the default root font size.

| Token | Value |
| --- | --- |
| `--space-1` | `0.25rem` |
| `--space-2` | `0.5rem` |
| `--space-3` | `0.75rem` |
| `--space-4` | `1rem` |
| `--space-5` | `1.25rem` |
| `--space-6` | `1.5rem` |
| `--space-8` | `2rem` |
| `--space-10` | `2.5rem` |
| `--space-12` | `3rem` |
| `--space-16` | `4rem` |

Use `--space-grid` (`1rem`) for normal card grids and `--space-grid-compact`
(`0.75rem`) for denser supporting grids.

### Section rhythm

| Token | Value | Use |
| --- | --- | --- |
| `--space-section` | `clamp(4.5rem, 9vw, 8rem)` | Page-level transitions between major sections |
| `--space-section-compact` | `clamp(3rem, 6vw, 5rem)` | Related content sections, project sections, and page-hero transitions |

Use margin to separate unbordered sections. When a divider represents the
boundary, use the same interval on both sides of the divider so the rule sits
between two balanced areas. Do not stack major and compact intervals at the
same boundary.

### Component padding

| Component | Padding |
| --- | --- |
| Cards and panels | `--padding-card`: `1.25rem` |
| Buttons | `--padding-button`: `0.75rem 1.25rem` |
| Form controls | `--padding-control`: `0.75rem 1rem` |
| Chips and compact pills | `--padding-chip`: `0.5rem 0.75rem` |
| Dialogs and overlays | `--padding-dialog`: `1.5rem` |

Use compact grid gaps for supporting collections and the default grid gap for
primary card collections. Inside components, prefer `--space-2` through
`--space-6`; reserve larger values for component groups and page structure.

## Responsive behavior

- Fluid type and section tokens retain the same semantic role at every width.
- The existing breakpoints at 1080px, 1024px, 899px, and 640px control layout,
  not alternate typography or spacing systems.
- At narrow widths, grids may collapse and action groups may stack, but their
  internal padding continues to use the same component recipes.
- Page gutters remain fluid through `--gutter`; the 640px layout may use its
  existing fixed one-rem edge gutter for predictable mobile alignment.

## Existing visual tokens

The color, surface, border, shadow, radius, and light/dark theme tokens already
defined in the stylesheet remain authoritative. This foundation does not
change the palette, theme behavior, or component states.

## Allowed exceptions

Raw values may be used for zero resets, one-pixel borders, fixed media or
control dimensions, absolute positioning, transforms, and documented optical
adjustments to icon glyphs. They must not create a parallel content typography,
component-padding, grid-gap, or section-spacing scale.

## Maintenance checklist

- Choose an existing typography role before adding or changing text styles.
- Use a spacing token for padding, gaps, and vertical rhythm.
- Use only the major or compact interval for section-level transitions.
- Match new cards, panels, controls, buttons, and chips to the component
  recipes above.
- Check representative desktop and mobile layouts in both themes.
- Audit literal font sizes and spacing values before merging; document any
  legitimate exception next to the rule that needs it.
