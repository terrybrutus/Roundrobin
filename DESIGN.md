# Design Brief

## Direction
Minimal deep link tester — tool for testing sportsbook deep links with zero UI clutter.

## Tone
Utilitarian brutalism. "Just open the link." Monospace throughout, flat surfaces, no decoration.

## Differentiation
Single-column focus with unified monospace font. No navigation, no sidebars—pure functional clarity. Electric green accent for all actions.

## Color Palette
| Token | OKLCH | Role |
|-------|-------|------|
| background | 0.12 0 0 | Pure black |
| foreground | 0.9 0 0 | Bright white text |
| card | 0.16 0 0 | Input/preset zone |
| primary | 0.75 0.2 145 | Electric green actions |
| accent | 0.75 0.2 145 | Highlights, active state |
| muted | 0.2 0 0 | Secondary zones |

## Typography
- Display: Geist Mono — headings, labels
- Body: Geist Mono — input placeholders, feedback text
- Scale: hero `text-2xl font-bold tracking-tight`, h2 `text-xl font-semibold`, label `text-sm font-mono`, body `text-base font-mono`

## Elevation & Depth
Flat surfaces only. No shadows. Thin 1px borders distinguish zones from background.

## Structural Zones
| Zone | Background | Border | Notes |
|------|------------|--------|-------|
| Header | bg-background | none | Title only |
| Input | bg-card | border-border | Text field zone |
| Presets | bg-card | border-border | One-tap buttons |
| Action | bg-background | none | Main test button |
| Feedback | bg-background | border-t border-border | Minimal text feedback |

## Spacing & Rhythm
Compact mobile-first: 1rem gaps between zones, 0.5rem padding in inputs. Vertical rhythm maintained with consistent rem multiples.

## Component Patterns
- Buttons: sharp corners (0px), green bg-primary, black text, no hover effect (opacity shift only)
- Inputs: sharp corners, thin border-border, monospace font, minimal padding
- Feedback: text-muted-foreground, monospace, single line

## Motion
- Entrance: none
- Hover: opacity 80% on button hover only
- Decorative: none

## Constraints
- No rounded corners anywhere
- No shadows or lift effects
- Mobile-responsive: single column always
- Monospace font exclusively

## Signature Detail
Unified monospace font + electric green accent on pure black. Reads like a CLI terminal tool in the browser.
