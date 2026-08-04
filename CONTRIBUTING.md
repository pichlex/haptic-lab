# Contributing to Haptic Lab

Thanks for helping improve Haptic Lab. The project combines ordinary cross-platform pointer controls with an experimental iPhone/WebKit haptic path, so device observations are especially valuable.

## Before opening an issue

Please include:

- device model
- exact iOS and browser version
- whether the page was opened in Safari, another iOS browser, or as a home-screen web app
- the control involved
- where the gesture started
- direction and speed of movement
- whether the issue happens on the first pass, after reversing direction, or after a second gesture

A short screen recording is useful, but describe the physical haptic result in text as well because it cannot be captured in video.

## Local development

```bash
npm install
npm test
npm run check
python3 -m http.server 8080
```

Open `http://localhost:8080/site/`.

## Pull requests

1. Keep the reusable engine inside `src/` and the presentation layer inside `site/`.
2. Do not duplicate package code inside the demo.
3. Preserve desktop pointer and keyboard behaviour when changing the iPhone touch path.
4. Avoid synthetic `.click()` calls as a haptic mechanism.
5. Add or update tests for deterministic geometry and utility changes.
6. Document any physical-device validation you performed.

## Coding style

- ES modules only.
- Prefer small, explicit classes and callback payloads.
- Keep the core package free of framework dependencies.
- Treat haptics as progressive enhancement.
- Avoid UI telemetry or debug copy in the public demo.

## Commit and PR scope

Keep pull requests focused. A good PR description explains:

- what changed
- why it changed
- desktop impact
- iPhone/WebKit impact
- tests and physical devices used
