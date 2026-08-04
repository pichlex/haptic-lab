<p align="center">
  <a href="https://pichlex.github.io/haptic-lab/">
    <img src="./assets/logo.svg" width="148" height="148" alt="Haptic Lab logo">
  </a>
</p>

<h1 align="center">Haptic Lab</h1>

<p align="center">
  Experimental web controls with native tactile detents on supported iPhones<br>
  and complete mouse, trackpad, touch, and keyboard fallbacks everywhere else.
</p>

<p align="center">
  <a href="https://github.com/pichlex/haptic-lab/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/pichlex/haptic-lab/ci.yml?branch=main&style=flat-square&label=CI"></a>
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-7c70ff?style=flat-square"></a>
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0--alpha.1-60a5fa?style=flat-square">
  <img alt="ES modules" src="https://img.shields.io/badge/modules-ESM-67e8f9?style=flat-square">
  <img alt="Node" src="https://img.shields.io/badge/node-%E2%89%A518-62e8a7?style=flat-square">
</p>

<p align="center">
  <a href="https://pichlex.github.io/haptic-lab/"><img alt="Open live demo" src="https://img.shields.io/badge/Open_live_demo-pichlex.github.io%2Fhaptic--lab-ffffff?style=for-the-badge&labelColor=17171c"></a>
  <a href="https://github.com/pichlex/haptic-lab/tree/main/src"><img alt="Browse API" src="https://img.shields.io/badge/Browse_API-src%2F-ffffff?style=for-the-badge&labelColor=17171c"></a>
</p>

---

## Why Haptic Lab

Haptic Lab explores a browser-only technique that positions a real Safari HTML switch beneath a custom control. The physical gesture stays trusted; on supported iPhones, WebKit may produce its native switch tick as the user crosses a detent. Other browsers receive the same interaction and visual response without a false claim of physical feedback.

The package and product site remain intentionally separate:

```text
src/   reusable interaction primitives
site/  English landing page and interactive gallery
```

The site imports `src/index.js` directly. There is no second copy of the engine.

## Installation

The package is pre-release software and is **not published to npm**. Install the current GitHub source:

```bash
npm install github:pichlex/haptic-lab#main
```

Or clone it for local development:

```bash
git clone https://github.com/pichlex/haptic-lab.git
cd haptic-lab
npm install
```

The module is ESM-only and requires Node.js 18 or newer for its development scripts.

## Usage

Every visual surface needs a transparent, rendered switch input. The package controls interaction only; the host application owns presentation.

### Range

```html
<div id="volume" class="range" tabindex="0">
  <div class="fill"></div>
  <div class="thumb"></div>
  <input id="volume-driver" type="checkbox" switch>
</div>
```

```js
import { HapticRange } from '@pichlex/haptic-lab';

const range = new HapticRange({
  surface: document.querySelector('#volume'),
  driver: document.querySelector('#volume-driver'),
  min: 0,
  max: 100,
  step: 10,
  value: 50,
  isMajor: (value) => value % 20 === 0,
  onValue: ({ value, ratio }) => {
    document.querySelector('.fill').style.width = `${ratio * 100}%`;
    document.querySelector('.thumb').style.left = `${ratio * 100}%`;
    console.log(value);
  },
  onTick: ({ value, kind, native }) => {
    console.log({ value, kind, native });
  },
});

// Update from application state, then dispose when the view unmounts.
range.setValue(70);
range.destroy();
```

### Dial and XY pad

```js
import { HapticDial, HapticXYPad } from '@pichlex/haptic-lab';

const dial = new HapticDial({
  surface: document.querySelector('#dial'),
  driver: document.querySelector('#dial-driver'),
  min: 0,
  max: 100,
  step: 5,
  onValue: ({ value, ratio }) => renderDial(value, ratio),
});

const pad = new HapticXYPad({
  surface: document.querySelector('#pad'),
  driver: document.querySelector('#pad-driver'),
  columns: 10,
  rows: 8,
  onValue: ({ x, y, cellX, cellY }) => renderCursor(x, y, cellX, cellY),
});
```

### Tap and toggle bindings

```js
import { bindHapticTap, bindHapticToggle } from '@pichlex/haptic-lab';

const unbindTap = bindHapticTap(document.querySelector('#button-driver'), () => {
  runAction();
});

const unbindToggle = bindHapticToggle(
  document.querySelector('#toggle-driver'),
  ({ checked }) => renderToggle(checked),
);

// Later:
unbindTap();
unbindToggle();
```

## Browser support

| Platform | Input path | Physical feedback |
|---|---|---|
| iPhone Safari / iOS WebKit | Native touch gesture over a rendered switch | Experimental system tick where supported |
| Safari, Chrome, Edge, Firefox on desktop | Pointer Events and keyboard | Visual detents only |
| Android browsers | Touch and pointer fallback | None built in |

Haptics are progressive enhancement. No control requires them to remain usable.

## API reference

### Exports

| Export | Purpose |
|---|---|
| `HapticRange` | Linear stepped control with minor/major detents |
| `HapticDial` | Angle-following rotary control |
| `HapticXYPad` | Two-dimensional grid control |
| `bindHapticTap` | Change listener for direct-action switch overlays |
| `bindHapticToggle` | Stateful switch binding; emits initial state immediately |
| `clamp`, `quantize`, `gridCell`, `angleToRatio` | Deterministic geometry helpers |
| `isTouchCapable`, `isFinePointer` | Input capability helpers |

TypeScript declarations are included in `src/index.d.ts`.

### `new HapticRange(options)`

Required options are `surface: HTMLElement` and `driver: HTMLInputElement`.

| Option | Default | Notes |
|---|---:|---|
| `min`, `max` | `0`, `100` | Numeric bounds |
| `step` | `10` | Detent interval |
| `value` | `50` | Initial value |
| `trackInset` | `14` | Horizontal inset in CSS pixels |
| `firstArmMs` | `228` | Delay before the native path is armed |
| `accentOffset` | `0` | Offset used by accented detent behaviour |
| `isMajor(value)` | `() => false` | Classifies strong detents |
| `pointToValue(context)` | linear mapping | Optional custom geometry |
| `xForValue(context)` | linear mapping | Optional value-to-position mapping |
| `onValue(event)` | no-op | Receives `{ value, ratio, animate }` |
| `onTick(event)` | no-op | Receives value, kind, phase, direction, and native status |

Methods: `setValue(value)` and `destroy()`. Current state is available as `currentValue`.

### `new HapticDial(options)`

Requires `surface` and `driver`. Supports `min`, `max`, `step`, `value`, `firstArmMs`, `isMajor`, `onValue`, and `onTick`, plus `arcStart` (`-135`) and `arcEnd` (`135`). Methods: `setValue(value)` and `destroy()`. Current state is available as `value`.

### `new HapticXYPad(options)`

Requires `surface` and `driver`. Options include `columns` (`10`), `rows` (`8`), `x` (`52`), `y` (`46`), `firstArmMs`, `onValue`, and `onTick`. `onValue` receives normalized ratios and grid cells; `onTick` reports crossed axes, input source, and native status. Method: `destroy()`. Current coordinates are available as `x` and `y`.

### Binding helpers

`bindHapticTap(input, callback)` and `bindHapticToggle(input, callback)` both return an unsubscribe function. The callback receives `{ event, checked }`.

## Project structure

```text
.
├── assets/                 brand, banner, and social preview assets
├── site/                   static landing page and component gallery
├── src/                    publishable package source and declarations
├── test/                   Node unit tests
├── .github/ISSUE_TEMPLATE/ structured bug and feature forms
└── .github/workflows/      CI, Pages, and production deployment workflows
```

## Development

```bash
npm install
npm test
npm run check
npm pack --dry-run
python3 -m http.server 8080
```

Open `http://localhost:8080/site/`.

## Limitations

- The native haptic path depends on current WebKit implementation details, not a standardized Haptics API.
- Physical feedback varies by iPhone model, iOS/WebKit version, gesture origin, and input conditions.
- Desktop and Android paths intentionally provide visual feedback only.
- The API is alpha and may change before `1.0.0`.
- Browser-level accessibility and VoiceOver coverage are not complete.
- The package supplies interaction primitives, not styled components or framework adapters.

## Roadmap

- Publish a device/OS/WebKit validation matrix.
- Freeze constructor options and callback payloads.
- Add browser-level pointer, touch, keyboard, and accessibility tests.
- Complete VoiceOver and screen-reader review.
- Add provenance-enabled npm publishing after the alpha stabilizes.
- Explore framework adapters without adding dependencies to the core.

See [`ROADMAP.md`](./ROADMAP.md) and [`CHANGELOG.md`](./CHANGELOG.md) for details.

## Contributing

Bug reports, physical-device observations, documentation improvements, and focused API proposals are welcome. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md), use the structured issue forms, and keep package code in `src/` and demo code in `site/`.

## License

MIT © [pichlex](https://github.com/pichlex)
