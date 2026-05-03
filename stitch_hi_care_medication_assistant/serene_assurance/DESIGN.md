---
name: Serene Assurance
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#434652'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#737784'
  outline-variant: '#c3c6d5'
  surface-tint: '#2759bb'
  primary: '#0043a2'
  on-primary: '#ffffff'
  primary-container: '#2a5cbe'
  on-primary-container: '#d1dcff'
  inverse-primary: '#b1c5ff'
  secondary: '#6b4ab2'
  on-secondary: '#ffffff'
  secondary-container: '#b191fd'
  on-secondary-container: '#44208a'
  tertiary: '#42495c'
  on-tertiary: '#ffffff'
  tertiary-container: '#596175'
  on-tertiary-container: '#d5dcf4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001946'
  on-primary-fixed-variant: '#00419e'
  secondary-fixed: '#eaddff'
  secondary-fixed-dim: '#d1bcff'
  on-secondary-fixed: '#24005b'
  on-secondary-fixed-variant: '#523198'
  tertiary-fixed: '#dbe2fa'
  tertiary-fixed-dim: '#bfc6dd'
  on-tertiary-fixed: '#141b2c'
  on-tertiary-fixed-variant: '#3f4759'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 20px
---

## Brand & Style

The brand personality of this design system is rooted in quiet strength and radical empathy. It balances the precision of clinical expertise with the warmth of a supportive companion. The target audience—individuals managing HIV—requires an interface that feels stable, non-judgmental, and deeply secure. 

The visual style is **Modern Corporate** with a focus on **Minimalism**. It avoids clinical coldness by using soft light-diffusing surfaces and generous whitespace. The interface remains low-profile to ensure privacy in public spaces, utilizing subtle indicators rather than loud notifications. The goal is to evoke a sense of "calm control" over one's health journey.

## Colors

The palette utilizes "Calming Blues" to represent stability and medical professionalism, paired with "Supportive Purples" to add a layer of humanity and grace. 

- **Primary Blue:** Used for critical actions and primary navigation.
- **Supportive Purple:** Used for wellness tracking, community features, and positive reinforcement.
- **Surface Tints:** Soft, desaturated blue-greys are used for backgrounds to reduce eye strain.
- **Privacy Mode:** Ensure that high-sensitivity data (medication names) uses low-contrast text colors or "tap-to-reveal" states to prioritize user privacy.

## Typography

This design system utilizes **Manrope** for its exceptional legibility and balanced, modern geometry. It feels approachable yet authoritative. **Inter** is used for functional labels and micro-copy to provide a systematic, highly-readable utility layer.

Type scales are generous to ensure accessibility for all users. Contrast ratios strictly follow WCAG AA standards to ensure that health information is never difficult to parse.

## Layout & Spacing

The system employs a **fluid grid** with a 4px baseline rhythm. For mobile interfaces, a 4-column structure is used with 16px gutters and 20px side margins to create a protected "content safe zone."

Layouts should prioritize vertical rhythm to make scanning through logs or appointments intuitive. Use large "touch targets" (minimum 48px) for all interactive elements to accommodate users who may have mobility or dexterity challenges.

## Elevation & Depth

To maintain a low-profile and modern aesthetic, depth is communicated through **tonal layers** and **ambient shadows**. 

- **Level 0 (Base):** Subtle off-white or very light blue-grey background.
- **Level 1 (Cards):** White surfaces with a soft, 10% opacity shadow (Blue-tinted) and a 1px soft-grey stroke.
- **Level 2 (Modals/Overlays):** Increased shadow spread to denote importance, using a backdrop blur (12px) to keep the user focused on the immediate task.

Avoid harsh blacks in shadows; always use a desaturated version of the primary blue to keep the elevation feeling integrated and soft.

## Shapes

The design system uses **Rounded** geometry (8px / 0.5rem base) to convey empathy and friendliness. 

- **Standard Buttons & Inputs:** 8px corner radius.
- **Containers/Cards:** 16px (rounded-lg) to create a soft, "container" feel for sensitive data.
- **Contextual Chips:** Fully pill-shaped (rounded-full) to distinguish them from actionable buttons.

## Components

- **Buttons:** Primary buttons use a solid Calming Blue fill with white text. Secondary buttons use a Purple outline. All buttons must have a clear "pressed" state that slightly deepens the tone.
- **Privacy Toggles:** A custom component that allows users to "mask" sensitive health data on the dashboard with a single tap.
- **Status Chips:** Use soft purple backgrounds for "On Track" or "Complete" states, and soft blue for "Upcoming" or "Scheduled."
- **Input Fields:** Use thick, soft-grey borders that transition to Blue on focus. Labels should always remain visible (floating labels) to provide constant context.
- **Progress Trackers:** Circular, soft-stroke gauges for medication adherence, using a gradient of Blue to Purple to visualize "Supportive Progress."
- **Cards:** Used for daily summaries. Information is grouped logically with high-contrast headers and low-contrast secondary data to help information hierarchy.