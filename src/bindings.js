import { prepareSwitch } from './utils.js';

export function bindHapticTap(input, callback) {
  prepareSwitch(input);
  const handler = (event) => callback?.({ event, checked: input.checked });
  input.addEventListener('change', handler);
  return () => input.removeEventListener('change', handler);
}

export function bindHapticToggle(input, callback) {
  prepareSwitch(input);
  const handler = (event) => callback?.({ event, checked: input.checked });
  input.addEventListener('change', handler);
  handler(new Event('change'));
  return () => input.removeEventListener('change', handler);
}
