---
name: Sakido
colors:
  surface: '#fff8f5'
  surface-dim: '#e2d8d3'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fcf1ec'
  surface-container: '#f6ece7'
  surface-container-high: '#f1e6e1'
  surface-container-highest: '#ebe0db'
  on-surface: '#1f1b18'
  on-surface-variant: '#51443c'
  inverse-surface: '#352f2c'
  inverse-on-surface: '#f9efe9'
  outline: '#83746b'
  outline-variant: '#d5c3b8'
  surface-tint: '#805533'
  primary: '#6f4627'
  on-primary: '#ffffff'
  primary-container: '#8b5e3c'
  on-primary-container: '#ffe3d1'
  inverse-primary: '#f4bb92'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#265763'
  on-tertiary: '#ffffff'
  tertiary-container: '#406f7c'
  on-tertiary-container: '#c1f0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc5'
  primary-fixed-dim: '#f4bb92'
  on-primary-fixed: '#301400'
  on-primary-fixed-variant: '#653d1e'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#baeaf9'
  tertiary-fixed-dim: '#9ecedd'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#1a4d59'
  background: '#fff8f5'
  on-background: '#1f1b18'
  surface-variant: '#ebe0db'
typography:
  display:
    fontFamily: Syne
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Syne
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Syne
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Syne
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  xxl: 128px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 40px
---

## Brand & Style
The design system is built upon a philosophy of "Essentialism." It targets students who seek mental clarity amidst academic pressure, drawing heavy inspiration from Muji’s aesthetic and high-fashion editorial layouts. The emotional response is one of calm, focus, and quiet sophistication.

The style is **Refined Minimalism**. It avoids all visual "noise"—no shadows, no gradients, and no unnecessary decorative elements. Instead, it relies on strict grid alignment, generous whitespace, and the juxtaposition of avant-garde typography against a functional, understated interface. The interface acts as a silent canvas for the user's tasks and thoughts.

## Colors
The palette is deeply restrained, utilizing a "Paper and Ink" foundation. 

- **Primary:** A warm, earthy brown (#8B5E3C) used sparingly for focus actions and subtle highlights. It represents grounded productivity.
- **Neutral/Surface:** In light mode, an off-white (#F9F9F9) reduces eye strain compared to pure white. In dark mode, a deep near-black (#121212) maintains the same sophisticated air.
- **Functional:** Success, error, and warning states should avoid bright neon tones, opting instead for desaturated versions of green and red that harmonize with the warm brown accent.

## Typography
The typographic hierarchy is the primary driver of the visual identity. 

- **Display & Headlines:** Use **Syne**. Its expressive, wide proportions provide the "editorial" feel. Use it for page titles and major section headers.
- **Body & UI:** Use **Manrope**. It is modern, highly legible, and neutral. It balances the personality of Syne with clinical precision.
- **Labels:** Use uppercase Manrope with increased letter spacing for small metadata or category tags to create a structured, "organized" appearance.

## Layout & Spacing
This design system employs a **Fluid Grid** with intentional "dead zones" of whitespace to allow the layout to breathe.

- **Grid:** A 12-column system on desktop with a generous 24px gutter. On mobile, use a 4-column system.
- **Rhythm:** Spacing follows a 4px base unit. Vertical rhythm is critical; use `xl` (64px) or `xxl` (128px) sections to separate major content blocks, creating the Muji-inspired sense of openness.
- **Alignment:** All elements must align strictly to the grid. Avoid centering text unless it is a display headline; left-alignment is the default for a structured, editorial look.

## Elevation & Depth
This is a **Flat Design** system. There are no shadows or blurs used to indicate depth. 

Instead, hierarchy is established through:
- **Tonal Layering:** Use subtle shifts in background color (e.g., a slightly darker off-white or a light grey) to distinguish containers.
- **Stroke:** Use 1px solid borders (#D1D1D1 in light mode, #2A2A2A in dark mode) to define sections.
- **Negative Space:** Elements are "elevated" simply by the amount of empty space surrounding them. The more important the element, the more whitespace it commands.

## Shapes
Shapes are geometric and disciplined. A low corner radius of 4px (Soft) is applied to buttons, input fields, and cards. This provides just enough approachability to avoid being "harsh" or "brutalist," while maintaining a professional, architectural structure. Icons should follow this logic, using 1.5pt or 2pt line weights with slightly softened caps.

## Components
- **Buttons:** Primary buttons use a solid black (or off-white in dark mode) background with no shadow. Secondary buttons use a 1px stroke. Padding should be generous (12px 24px).
- **Inputs:** Simple bottom-border only or a subtle 4px rounded box. Focus states use the warm brown (#8B5E3C) stroke.
- **Cards:** Defined by a 1px border or a subtle background tint. No shadows. Content inside cards should have at least 24px of internal padding.
- **Chips/Tags:** Small, rectangular with 2px radius. Use the `label-caps` typography style.
- **Lists:** High-contrast separators with generous vertical padding (16px+).
- **Icons:** Use thin-line (24px box, 1.5px stroke) icons. Icons should never be filled; they remain as wireframes to maintain the airy aesthetic.
- **Progress Bars:** Thin, 2px or 4px height. Use the warm brown for the fill and a very light neutral for the track.