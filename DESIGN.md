# Arrow visual system

The extension is an intentional pause control for YouTube. Its interface is a
quiet utility: the daily allowance is immediate to read, and the next action is
clear without adding visual noise.

## Surface mode

Operate. Popup tasks are short and frequent. The UI privileges scanability,
clear state, and familiar controls over decoration.

## Palette

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#eeede9` | `#202124` |
| Surface | `#f8f7f3` | `#2b2d30` |
| Text | `#303236` | `#e4e4df` |
| Muted text | `#626569` | `#b2b3af` |
| Divider | `#d0d0cb` | `#484a4d` |
| Action yellow | `#e2ad48` | `#e3b34f` |
| Heart orange | `#d68546` | `#e29553` |

## Components

- The popup has a fixed 420 by 600 CSS-pixel preferred size and scrolls when
  constrained.
- Home centers the seven pixel hearts and remaining time, then shows stacked
  pass actions. The pass prompt aligns with the labels inside the buttons,
  21px from the button edge. Pass buttons use charcoal surfaces and off-white
  labels and arrows in both themes.
- Settings and Custom use continuous divider-separated rows. Mode options use
  the same rhythm, with a visible selected marker.
- Primary actions use warm yellow with dark text; secondary actions use a
  neutral surface. Focus is shown with an amber ring. Targets are at least
  40 CSS pixels high.
- Existing SVG icon assets provide the icon language. The existing logo and
  pixel hearts remain recognizable.
- Light and dark themes share spacing, typography, and state hierarchy.

The implementation tokens and component rules live in
`css/visual-system.css`. `docs/specs/surfaces.md` remains the behavior contract.
