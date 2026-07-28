---
name: Sakido
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1b1b'
  surface-container: '#1f1f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#303030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e2e2e2'
  surface-variant: '#353535'
typography:
  display:
    fontFamily: Syne
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Syne
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Syne
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Syne
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1280px
---

## Brand & Style
The design system is rooted in **Editorial Minimalism** and **High-Contrast Brutalism**. It is designed for high-performance users who value clarity, speed, and focus. The brand personality is confident, unsentimental, and authoritative. 

The aesthetic rejects "soft" modern UI trends (like glassmorphism or neomorphism) in favor of a rigid, structured environment. It utilizes a pure black background to eliminate visual noise, relying on stark white typography and razor-sharp borders to define the interface. The emotional response is one of intentionality and discipline—the UI stays out of the way until a decision is required.

## Colors
The palette is strictly monochromatic to maintain an editorial feel and maximize focus.

- **Background:** Pure Black (`#000000`). No gradients or tints.
- **Surface:** Deep Gray (`#171717`) used for secondary containers.
- **Primary:** Stark White (`#FFFFFF`) for primary text and high-action triggers.
- **Muted:** Mid-Grays (`#737373`) for secondary information and disabled states.
- **Border:** Dark Gray (`#262626`) for structural definition.

Color is never used for decoration. It is used only as a functional signifier for state changes (e.g., hover) or critical errors.

## Typography
Typography is the primary design element of the design system. 

1. **Display & Headings:** Uses **Syne**. It provides a heavy, geometric, and "extra-bold" presence that anchors the page. Large headlines should use negative letter-spacing to create a dense, editorial look.
2. **Body & UI:** Uses **Inter**. A neutral, functional sans-serif chosen for legibility in dense productivity contexts.
3. **Data & Metadata:** Uses **JetBrains Mono**. This monospaced font is used for labels, dates, and technical information to reinforce the "tool-like" nature of the application.

All text must be rendered with `antialiased` properties.

## Layout & Spacing
The layout follows a **Rigid Grid** philosophy. 

- **Grid:** 12-column system on desktop, 4-column on mobile.
- **Margins:** Generous outer margins (64px+) on desktop to create a centered "canvas" feel.
- **Rhythm:** All spacing must be a multiple of 4px. Use large gaps (64px, 80px, 128px) between major sections to emphasize the minimal, editorial aesthetic.
- **Alignment:** Content should predominantly be left-aligned to maintain a strong vertical "axis" common in print design.

## Elevation & Depth
This design system avoids all traditional depth markers.

- **No Shadows:** Elevation is not represented through Z-axis shadows.
- **Tonal Layering:** Depth is achieved by placing `#171717` (Surface) elements on the `#000000` (Background).
- **Outlines:** Use 1px solid borders (`#262626`) to define containers. 
- **Focus States:** When an element is active or focused, it should transition to a `#FFFFFF` border or a solid white background with black text.

## Shapes
The shape language is sharp and architectural.

- **Primary Radius:** 4px or 6px. This is used for buttons, input fields, and cards.
- **Zero Radius:** Used for high-level structural containers (sidebars, headers, main panels) to create a "built-in" look.
- **No Pills:** Under no circumstances should buttons or tags be fully rounded (pill-shaped).

## Components

### Buttons
- **Primary:** Solid `#FFFFFF` background with `#000000` text. All caps or bold weight. Square or 4px radius.
- **Secondary:** Transparent background with 1px `#262626` border. White text. 
- **Hover:** Secondary buttons invert to white background on hover. Primary buttons shift to `#E5E5E5`.

### Input Fields
- **Default:** 1px border (`#262626`), no background. White text.
- **Focus:** 1px white border. No glow/shadow.
- **Labels:** Small monospaced text (`label-sm`) placed above the input, always uppercase.

### Cards & Containers
- Cards are defined by 1px borders. Use generous internal padding (at least 24px).
- Avoid "cards within cards." Use whitespace and horizontal rules (`<hr />`) to separate content within a container.

### Lists & Tasks
- Items are separated by 1px horizontal lines. 
- High-contrast interaction: checking a task should not just show an icon, but strike through and change text opacity to 40%.

### Lists
- Use monospaced numbers (`1.`, `2.`, `3.`) for ordered lists to maintain the technical, functional aesthetic.

### Exclusions
- No "success" green or "warning" orange icons unless strictly necessary for safety. 
- No status pills/badges. Use simple text labels with a monospaced font.