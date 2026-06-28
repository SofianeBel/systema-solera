# Systema Solera Design System

## 1. Atmosphere & Identity

Systema Solera feels like a private observatory for an AI model constellation. The signature is gravitational framing: each model card behaves like a viewport into an already-live 3D celestial scene, then expands into the scene when selected. The interface is almost silent so the planets, corona, starfield, and shader light become the brand.

## 2. Color

### Palette

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Page/frame | `--color-page` | `oklch(0.985 0 0)` | Outer frame around the reference card grid |
| Space/background | `--color-space` | `oklch(0.075 0 0)` | Root canvas, immersive scenes |
| Space/deep | `--color-space-deep` | `oklch(0.025 0 0)` | Scene gradients, card interiors |
| Surface/spectral | `--color-spectral` | `oklch(0.96 0.011 255)` | Primary text, key outlines on dark |
| Text/muted | `--color-muted` | `oklch(0.72 0.018 255)` | Secondary copy, price labels |
| Text/faint | `--color-faint` | `oklch(0.53 0.018 255)` | Tertiary metadata |
| Brand/cobalt | `--color-cobalt` | `oklch(0.541 0.122 248.2)` | Focus, selected state, system accent |
| Solar | `--color-sol` | `oklch(0.78 0.17 78)` | Sol glow, solar highlights |
| Terra | `--color-terra` | `oklch(0.65 0.12 203)` | Terra atmosphere, ocean highlights |
| Luna | `--color-luna` | `oklch(0.79 0.018 255)` | Moon rim light, quiet highlights |
| Danger/heat | `--color-heat` | `oklch(0.62 0.18 38)` | Solar flare accents only |
| Focus ring | `--color-focus` | `oklch(0.68 0.16 248.2)` | Keyboard focus and active selection |

### Rules

- The default surface is pure near-black; avoid tinted cream, default SaaS purple, or decorative multicolor gradients.
- Color is emitted by the celestial bodies. UI chrome stays spectral white, muted blue-gray, and cobalt.
- Text on saturated fills uses spectral white. Dark text is only allowed on pale neutral fills.
- New colors must be added here before use.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | `clamp(3.5rem, 9vw, 8.5rem)` | 650 | 0.9 | `-0.055em` | Model names inside cards |
| H1 | `clamp(2.75rem, 7vw, 6rem)` | 600 | 0.95 | `-0.045em` | Page hero |
| H2 | `clamp(2rem, 4vw, 3.75rem)` | 600 | 1 | `-0.035em` | Immersive scene title |
| H3 | `clamp(1.5rem, 2.4vw, 2.25rem)` | 560 | 1.08 | `-0.025em` | Card subheads |
| Body/lg | `clamp(1.125rem, 1.6vw, 1.35rem)` | 400 | 1.55 | `-0.01em` | Lead paragraphs |
| Body | `1rem` | 400 | 1.55 | `0` | Standard copy |
| Caption | `0.875rem` | 450 | 1.35 | `0` | Prices, metadata |
| Mono | `0.75rem` | 500 | 1.25 | `0.08em` | Small model/system labels |

### Font Stack

- Primary: `Geist Sans`, `Arial`, `Helvetica Neue`, system sans-serif.
- Mono: `Geist Mono`, `ui-monospace`, `SFMono-Regular`, `Menlo`, monospace.

### Rules

- Use one primary family for the OpenAI-like restraint; mono appears only for compact technical metadata.
- Avoid all-caps body copy. Short mono labels may be uppercase only when they read as instrumentation.
- Model names can be very large, but must not overflow on mobile.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Hairline offsets, tight icon gaps |
| `--space-2` | `8px` | Compact groups |
| `--space-3` | `12px` | Labels to values |
| `--space-4` | `16px` | Card inner rhythm |
| `--space-6` | `24px` | Card padding on mobile |
| `--space-8` | `32px` | Card padding desktop, header gaps |
| `--space-12` | `48px` | Major content group gaps |
| `--space-16` | `64px` | Scene overlay spacing |
| `--space-24` | `96px` | Desktop top/bottom breathing room |

### Grid

- Max content width: `1480px`.
- Landing cards: three-column desktop constellation grid, single-column mobile stack.
- Card aspect: portrait, minimum height `min(810px, calc(100dvh - 53px))` on desktop, at least `520px` on mobile.
- Use `min-height: 100dvh`, never fixed `100vh`, for full-screen surfaces.

### Rules

- The card grid is the main composition. Do not add unrelated feature grids below it unless the user asks.
- Asymmetry comes from celestial body placement inside each card, not random card sizing.
- Every spacing value in CSS maps to this token scale or a documented viewport expression.

## 5. Components

### Model Card

- **Structure**: focusable button/card containing a WebGL canvas layer, dark legibility wash, model name, role copy, and three price cells.
- **Variants**: `sol`, `terra`, `luna`.
- **Spacing**: `--space-6` mobile and desktop, with an 8px card radius for the reference-card surface.
- **States**: default animated scene, hover camera drift, focus cobalt ring, active zoom transition.
- **Accessibility**: native button semantics or explicit keyboard handlers; card text remains readable without WebGL.
- **Motion**: hover uses transform and filter only; selected state expands into the immersive scene.

### Immersive Scene

- **Structure**: full-screen WebGL scene, top navigation/back control, compact model details overlay, optional pricing strip.
- **Variants**: solar corona, earth atmosphere, lunar rim.
- **Spacing**: `--space-8` frame inset on desktop, `--space-4` on mobile.
- **States**: entering, active, exiting, reduced-motion crossfade.
- **Accessibility**: Escape returns to grid; back button is first in tab order.
- **Motion**: camera dolly, star parallax, shader time uniforms; reduced motion disables camera travel.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | `140ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Button hover, focus halo |
| Card hover | `700ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Slow orbital drift |
| Scene enter | `1100ms` | `cubic-bezier(0.19, 1, 0.22, 1)` | Card-to-space transition |
| Scene exit | `650ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Return to grid |

### Rules

- Animate only transform, opacity, filter, and shader uniforms.
- Every animation has a reduced-motion alternative.
- Transitions should feel like a camera entering a viewport, not a modal opening.
- Pointer movement can influence camera/parallax, but interaction must remain usable without pointer precision.

## 7. Depth & Surface

### Strategy

Mixed, but only because WebGL provides physical depth while UI chrome stays flat.

| Level | Treatment | Usage |
|-------|-----------|-------|
| Void | `--color-space-deep` plus starfield | Scene background |
| Body glow | Shader emission and bloom-like CSS filter | Celestial scale and heat |
| UI ring | `1px solid color-mix(in oklch, var(--color-spectral), transparent 82%)` | Card edge, ghost controls |
| Focus | `0 0 0 2px var(--color-focus)` | Keyboard focus only |

Do not use glassmorphism panels by default. If an overlay needs legibility, use a dark gradient wash rather than frosted cards.
