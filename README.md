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

## What it is

Haptic Lab explores a browser-only technique for building custom controls around a real, rendered Safari HTML switch. On supported iPhones, the physical gesture remains trusted and WebKit produces the system haptic tick. On desktop browsers, the same controls use ordinary Pointer Events and keyboard input without pretending that physical haptics exist.

The reusable package and the landing page are separate:

```text
src/     reusable interaction primitives
test/    unit tests for geometry and utilities
site/    English landing page and component gallery
```

The site imports `src/index.js` directly; it does not ship a duplicate engine.

## Live controls

| Primitive | Behaviour |
|---|---|
| `HapticRange` | Linear slider with configurable steps and accented detents |
| `HapticDial` | True angle-following rotary control |
| `HapticXYPad` | Two-dimensional grid surface with X/Y crossings |
| `bindHapticTap` | Direct-touch helper for buttons and tabs |
| `bindHapticToggle` | Direct-touch helper for custom toggle surfaces |

See all of them at **[pichlex.github.io/haptic-lab](https://pichlex.github.io/haptic-lab/)**.

## Install

The package is currently an alpha and is not published to npm yet. Install it directly from GitHub:

```bash
npm install github:pichlex/haptic-lab#main
```

```js
import {
  HapticDial,
  HapticRange,
  HapticXYPad,
  bindHapticTap,
  bindHapticToggle,
} from '@pichlex/haptic-lab';
```

### Minimal range example

```html
<div id="surface" class="range-surface">
  <div class="track"></div>
  <div class="thumb"></div>
  <input id="driver" type="checkbox" switch>
</div>
```

```js
import { HapticRange } from '@pichlex/haptic-lab';

const range = new HapticRange({
  surface: document.querySelector('#surface'),
  driver: document.querySelector('#driver'),
  min: 0,
  max: 100,
  step: 10,
  value: 50,
  onValue: ({ value, ratio }) => {
    document.querySelector('.thumb').style.left = `${ratio * 100}%`;
    console.log(value);
  },
});
```

## Browser behaviour

| Platform | Interaction | Physical feedback |
|---|---|---|
| iPhone Safari / iOS WebKit | Touch, drag, direction changes | Experimental native system ticks |
| macOS Safari, Chrome, Firefox | Mouse, trackpad, keyboard | Visual detents only |
| Android browsers | Touch and pointer fallback | Optional `navigator.vibrate()` can be added by the host app |

The haptic path relies on current WebKit implementation details. Treat it as progressive enhancement, not as a guaranteed web-platform API.

## Development

```bash
npm install
npm test
npm run check
npm run pack:dry-run
```

Serve the repository root with any static file server and open `/site/`.

```bash
python3 -m http.server 8080
# http://localhost:8080/site/
```

## Public API

```js
export {
  HapticRange,
  HapticDial,
  HapticXYPad,
  bindHapticTap,
  bindHapticToggle,
};
```

Type declarations are included through `src/index.d.ts`.

## Release status

Current version: **`0.1.0-alpha.1`**.

Already included:

- ESM package exports
- TypeScript declarations
- unit tests and CI
- desktop pointer and keyboard fallbacks
- English component gallery
- GitHub Pages workflow
- MIT license

Before a stable release:

- document a physical iPhone and iOS/WebKit test matrix
- freeze constructor options and callback payloads
- add browser-level pointer, touch, keyboard, and accessibility tests
- complete VoiceOver and screen-reader review
- add trusted npm publishing with provenance

The detailed plan lives in [`ROADMAP.md`](./ROADMAP.md).

## Contributing

Bug reports, device observations, and API proposals are welcome. Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a pull request.

## License

MIT © [pichlex](https://github.com/pichlex)
