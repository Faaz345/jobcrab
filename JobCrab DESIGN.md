---
name: JobCrab
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5e3f3b'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#936e6a'
  outline-variant: '#e8bcb7'
  surface-tint: '#c00011'
  primary: '#bb0010'
  on-primary: '#ffffff'
  primary-container: '#e80f1b'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4ab'
  secondary: '#8c4f26'
  on-secondary: '#ffffff'
  secondary-container: '#ffae7d'
  on-secondary-container: '#794018'
  tertiary: '#5a5c5c'
  on-tertiary: '#ffffff'
  tertiary-container: '#737575'
  on-tertiary-container: '#fcfcfc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000a'
  secondary-fixed: '#ffdbc8'
  secondary-fixed-dim: '#ffb68b'
  on-secondary-fixed: '#321300'
  on-secondary-fixed-variant: '#6f3810'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  hero-display:
    fontFamily: Anton
    fontSize: 72px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: 0.02em
  hero-display-mobile:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.2'
  section-heading:
    fontFamily: Anton
    fontSize: 36px
    fontWeight: '400'
    lineHeight: '1.2'
  card-title:
    fontFamily: Oswald
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body:
    fontFamily: Oswald
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  technical-label:
    fontFamily: Oswald
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1152px
  gutter: 1.5rem
  card-gap: 1rem
  section-padding: 5rem
---

## Brand & Style

The design system embodies a **High-Contrast / Bold** aesthetic, positioned as an "AI-Powered Performance Engine." It prioritizes speed, precision, and the metaphor of industrial "engines" driving a job application pipeline with maximum energy.

The visual identity is **Light-first**, utilizing a stark white foundation paired with a vibrant red to create a high-impact, focused environment. The brand personality is authoritative and urgent, leaning into the efficiency of LLM-driven automation while maintaining a high-visibility narrative.

### Style Principles
- **Vibrant Impact:** Heavy use of Primary Red against White creates a sense of high-priority task management.
- **Sequential Flow:** The UI continues to reinforce the "Pipeline" structure, now with clearer, bolder demarcations.
- **Functional Color:** Color is used for immediate semantic recognition and brand energy.
- **Bold Flourish:** A red-to-orange gradient is used for hero accents to signify the "heat" of active AI processing.

## Colors

The palette is designed for maximum contrast and high energy.

### Semantic Color System
- **Job Sources:** Used for badges and borders to identify the origin of a lead.
  - **RemoteOK:** Emerald (Success/Growth)
  - **Naukri:** Blue (Corporate/Reliable)
  - **Wellfound:** Purple (Startup/Creative)
- **Pipeline Stages:**
  - **Discovered:** Blue-400
  - **Tailored:** Purple-400
  - **Outreach:** Amber-400
  - **Response:** Emerald-400
  - **Interview:** Cyan-400
  - **Offer:** Green-400
- **Feature Engines:** Solid red accents or subtle secondary orange fills differentiate the product modules.

## Typography

This design system uses **Anton** for its heavy, condensed, and impactful headline presence. **Oswald** is used for all body copy, technical metadata, and labels to maintain a consistent, efficient, and modern "news-ticker" aesthetic.

- **Hero Text:** The primary headline should be set in Anton and features a bold Primary Red color or gradient.
- **Body Copy:** Use Oswald for all descriptions to maintain a high-density, high-legibility layout.
- **Data Display:** Oswald’s condensed nature is used for status counts and metrics to ensure data feels compact and organized.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a max-width constraint for marketing surfaces and a "Shell" model for the dashboard.

### Dashboard Layout
- **Navigation:** A sticky top bar with a high-contrast bottom border creates a clear separation from content.
- **The Pipeline (Kanban):** Elements are organized horizontally. Each column uses condensed typography to maximize information density.
- **Marketing:** Uses a centered max-width of 1152px (6xl) with generous vertical padding to let the bold headlines stand out.
- **Reflow:** On mobile, Kanban columns stack into a vertical list; grids transition from 3-columns to 1-column.

## Elevation & Depth

Hierarchy is achieved through **Bold Borders** and **Tonal Layering** rather than heavy shadows.

- **Surface 0 (Background):** Pure White.
- **Surface 1 (Cards/Popovers):** White surfaces with defined 1px or 2px neutral or primary borders.
- **Interaction:** On hover, cards gain a Primary Red border or a slight, sharp shadow to indicate interactivity.
- **Depth Cues:** Minimal use of blur; reliance on sharp lines and solid color blocks to define layers.

## Shapes

The system uses a **0.5rem (8px)** base radius to strike a balance between modern software design and sharp industrial precision.

- **Standard Elements:** Inputs, Buttons, and standard Cards use the base radius.
- **Inner Elements:** Use `rounded-sm` (4px) for nested items to maintain corner harmony.
- **Status Pills:** Small badges should use a full pill radius to stand out against the condensed typography.

## Components

### Buttons & Inputs
- **Primary Action:** Solid Primary Red background with White Oswald (Bold) text.
- **Ghost/Secondary:** White backgrounds with bold 2px borders.
- **Inputs:** High-contrast white fills with borders that brighten/redden on focus.

### Cards
- **Job Cards:** Feature a Primary Red or source-colored left-border for instant categorization.
- **Stats Cards:** Minimalist, featuring a large Oswald numerical value and high-contrast labels.

### Pipeline Components
- **Kanban Columns:** Vertical containers with bold Anton headers matching the Stage Color or Primary Red.
- **Badges:** Use solid color fills or high-contrast outlined versions for readability on light surfaces.

### Feedback
- **Sonner Toasts:** Positioned bottom-right. Use high-visibility colors (Red for alert, Emerald for success) to signify AI operation results.