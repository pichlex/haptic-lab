export function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function quantize(value, step, origin = 0) {
  if (!(step > 0)) return value;
  return origin + Math.round((value - origin) / step) * step;
}

export function gridCell(value, count) {
  return clamp(Math.floor((value / 100) * count), 0, count - 1);
}

export function angleToRatio(angle, start = -135, end = 135) {
  const span = end - start;
  if (!(span > 0)) throw new RangeError('end must be greater than start.');

  let normalized = angle;
  while (normalized < -180) normalized += 360;
  while (normalized > 180) normalized -= 360;

  return clamp((normalized - start) / span, 0, 1);
}

export function isTouchCapable() {
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
}

export function isFinePointer() {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(hover: hover) and (pointer: fine)').matches
  );
}

export function assertElement(value, name, constructor) {
  if (!(value instanceof constructor)) {
    throw new TypeError(`${name} must be a ${constructor.name}.`);
  }
}

export function touchById(touchList, identifier) {
  for (const touch of touchList) {
    if (touch.identifier === identifier) return touch;
  }
  return null;
}

export function prepareSwitch(input) {
  assertElement(input, 'driver', HTMLInputElement);
  input.type = 'checkbox';
  input.setAttribute('switch', '');
}

export function nextGridTick(value, direction, { min, max, step }) {
  if (direction > 0) {
    const index = Math.floor((value - min + 0.0001) / step) + 1;
    const next = min + index * step;
    return next < max ? next : null;
  }

  if (direction < 0) {
    const index = Math.ceil((value - min - 0.0001) / step) - 1;
    const next = min + index * step;
    return next > min ? next : null;
  }

  return null;
}

export function crossed(fromValue, toValue, tick, direction) {
  if (tick === null) return false;
  if (direction > 0) return fromValue < tick && toValue >= tick;
  if (direction < 0) return fromValue > tick && toValue <= tick;
  return false;
}

export function listCrossedTicks(fromValue, toValue, options) {
  const direction = Math.sign(toValue - fromValue);
  if (!direction) return [];

  const ticks = [];
  let probe = fromValue;

  for (let guard = 0; guard < 512; guard += 1) {
    const tick = nextGridTick(probe, direction, options);
    if (tick === null || !crossed(probe, toValue, tick, direction)) break;
    ticks.push(tick);
    probe = tick + direction * 0.0001;
  }

  return ticks;
}
