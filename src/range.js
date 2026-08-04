import {
  assertElement,
  clamp,
  crossed,
  isTouchCapable,
  listCrossedTicks,
  nextGridTick,
  prepareSwitch,
  touchById,
} from './utils.js';

const RANGE_DEFAULTS = {
  min: 0,
  max: 100,
  step: 10,
  value: 50,
  trackInset: 14,
  driverHeight: 72,
  firstArmMs: 228,
  parkWidth: 1200,
  parkHeight: 100,
  parkLocalLeft: 1,
  startOffsetProportion: 0.4,
  directionEpsilon: 0.65,
  rearmDelayMs: 0,
  accentOffset: 0,
  isMajor: () => false,
  onValue: () => {},
  onTick: () => {},
  onDebug: () => {},
};

export class HapticRange {
  constructor(options) {
    this.options = { ...RANGE_DEFAULTS, ...options };
    this.surface = this.options.surface;
    this.driver = this.options.driver;

    assertElement(this.surface, 'surface', HTMLElement);
    prepareSwitch(this.driver);

    this.value = clamp(
      Number(this.options.value),
      this.options.min,
      this.options.max,
    );
    this.currentValue = this.value;

    this.activePointerId = null;
    this.activeTouchId = null;
    this.desktopDrag = false;
    this.gestureStartedAt = 0;
    this.armTimer = null;
    this.rearmTimer = null;

    this.startClientX = 0;
    this.startLocalFull = 0;
    this.previousTouchValue = this.value;
    this.movementDirection = 0;
    this.parkingApplied = false;
    this.storedStartLocal = null;
    this.firstArmed = false;
    this.hasTicked = false;
    this.visualStateOn = false;
    this.targetTick = null;
    this.targetMode = 'grid';
    this.echoBaseTick = null;

    this.abortController = new AbortController();
    this.signal = this.abortController.signal;
    this.finePointerQuery = matchMedia('(hover: hover) and (pointer: fine)');

    this.syncPointerMode();
    this.bindEvents();
    this.resetDriverFull();
    this.emitValue(this.value, false);
  }

  syncPointerMode() {
    const desktopOnly = this.finePointerQuery.matches && !isTouchCapable();
    this.surface.classList.toggle('is-fine-pointer', desktopOnly);
    this.driver.style.pointerEvents = desktopOnly ? 'none' : 'auto';
  }

  bindEvents() {
    this.surface.addEventListener(
      'pointerdown',
      (event) => this.handlePointerDown(event),
      { signal: this.signal },
    );
    window.addEventListener(
      'pointermove',
      (event) => this.handlePointerMove(event),
      { capture: true, signal: this.signal },
    );
    window.addEventListener(
      'pointerup',
      (event) => this.finishPointer(event),
      { capture: true, signal: this.signal },
    );
    window.addEventListener(
      'pointercancel',
      (event) => this.finishPointer(event),
      { capture: true, signal: this.signal },
    );

    this.surface.addEventListener(
      'touchstart',
      (event) => this.handleTouchStart(event),
      { capture: true, passive: true, signal: this.signal },
    );
    this.surface.addEventListener(
      'touchmove',
      (event) => this.handleTouchMove(event),
      { capture: true, passive: true, signal: this.signal },
    );
    this.surface.addEventListener(
      'touchend',
      (event) => this.finishTouch(event),
      { capture: true, passive: true, signal: this.signal },
    );
    this.surface.addEventListener(
      'touchcancel',
      (event) => this.finishTouch(event),
      { capture: true, passive: true, signal: this.signal },
    );

    this.finePointerQuery.addEventListener(
      'change',
      () => this.syncPointerMode(),
      { signal: this.signal },
    );
    window.addEventListener(
      'resize',
      () => this.emitValue(this.currentValue, false),
      { signal: this.signal },
    );
  }

  debug(message) {
    this.options.onDebug({
      message,
      value: this.currentValue,
      target: this.targetTick,
      direction: this.movementDirection,
    });
  }

  metrics() {
    const rect = this.surface.getBoundingClientRect();
    const left = this.options.trackInset;
    const right = rect.width - this.options.trackInset;
    return { rect, left, right, width: Math.max(1, right - left) };
  }

  valueFromPoint(clientX, clientY) {
    if (typeof this.options.pointToValue === 'function') {
      return clamp(
        this.options.pointToValue({
          clientX,
          clientY,
          surface: this.surface,
          min: this.options.min,
          max: this.options.max,
        }),
        this.options.min,
        this.options.max,
      );
    }

    const { rect, width } = this.metrics();
    const ratio = clamp(
      (clientX - rect.left - this.options.trackInset) / width,
      0,
      1,
    );
    return this.options.min + ratio * (this.options.max - this.options.min);
  }

  xFromValue(value) {
    if (typeof this.options.xForValue === 'function') {
      return this.options.xForValue({
        value,
        surface: this.surface,
        min: this.options.min,
        max: this.options.max,
      });
    }

    const { left, width } = this.metrics();
    const ratio =
      (clamp(value, this.options.min, this.options.max) - this.options.min) /
      (this.options.max - this.options.min);
    return left + width * ratio;
  }

  emitValue(value, animate) {
    this.currentValue = clamp(value, this.options.min, this.options.max);
    this.options.onValue({
      value: this.currentValue,
      animate,
      ratio:
        (this.currentValue - this.options.min) /
        (this.options.max - this.options.min),
    });
  }

  handlePointerDown(event) {
    if (event.pointerType === 'touch') return;
    if (event.button !== 0 || !this.surface.contains(event.target)) return;

    event.preventDefault();
    this.desktopDrag = true;
    this.activePointerId = event.pointerId;
    this.surface.classList.add('is-dragging');

    try {
      this.surface.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a progressive enhancement.
    }

    this.emitValue(this.valueFromPoint(event.clientX, event.clientY), false);
  }

  handlePointerMove(event) {
    if (event.pointerId !== this.activePointerId || !this.desktopDrag) return;

    const previous = this.currentValue;
    const next = this.valueFromPoint(event.clientX, event.clientY);
    this.emitValue(next, false);

    for (const tick of listCrossedTicks(previous, next, this.options)) {
      const direction = Math.sign(next - previous);
      const major = Boolean(this.options.isMajor(tick));
      this.options.onTick({
        value: tick,
        kind: major ? 'major' : 'minor',
        phase: 'primary',
        direction,
        native: false,
      });
      this.emitValue(next, true);
    }
  }

  finishPointer(event) {
    if (event.pointerId !== this.activePointerId) return;

    this.surface.classList.remove('is-dragging');
    try {
      this.surface.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore unsupported release.
    }

    this.desktopDrag = false;
    this.activePointerId = null;
  }

  resetDriverFull() {
    clearTimeout(this.rearmTimer);
    Object.assign(this.driver.style, {
      left: '0px',
      right: 'auto',
      top: '0px',
      width: '100%',
      height: `${this.options.driverHeight}px`,
      direction: 'ltr',
    });
    void this.driver.offsetWidth;
  }

  applyParking(direction) {
    const rect = this.surface.getBoundingClientRect();
    const startX = this.startClientX - rect.left;
    const localRight = this.options.parkWidth - 1;

    if (direction > 0) {
      this.driver.style.direction = 'ltr';
      this.driver.style.left = `${startX - localRight}px`;
      this.storedStartLocal = localRight;
    } else {
      this.driver.style.direction = 'rtl';
      this.driver.style.left = `${startX - this.options.parkLocalLeft}px`;
      this.storedStartLocal = this.options.parkLocalLeft;
    }

    Object.assign(this.driver.style, {
      right: 'auto',
      width: `${this.options.parkWidth}px`,
      height: `${Math.max(this.options.parkHeight, this.surface.clientHeight)}px`,
    });
    this.parkingApplied = true;
    void this.driver.offsetWidth;
  }

  applyFirstTargetGeometry(tick, direction) {
    if (tick === null || direction === 0) return;

    const targetX = this.xFromValue(tick);
    const storedStart = this.parkingApplied
      ? this.storedStartLocal
      : this.startLocalFull;
    const width = this.options.parkWidth;

    if (direction > 0) {
      const requiredHeight = Math.max(20, width - storedStart + 12);
      const changePosition =
        storedStart + this.options.startOffsetProportion * width;
      Object.assign(this.driver.style, {
        direction: 'ltr',
        left: `${targetX - changePosition}px`,
        right: 'auto',
        width: `${width}px`,
        height: `${requiredHeight}px`,
      });
    } else {
      const requiredHeight = Math.max(
        20,
        Math.min(120, (width - storedStart) / 2),
      );
      const changePosition =
        storedStart - this.options.startOffsetProportion * width;
      Object.assign(this.driver.style, {
        direction: 'rtl',
        left: `${targetX - changePosition}px`,
        right: 'auto',
        width: `${width}px`,
        height: `${requiredHeight}px`,
      });
    }

    void this.driver.offsetWidth;
  }

  applyNormalTargetGeometry(tick, direction) {
    if (tick === null || direction === 0) return;

    const { left, right } = this.metrics();
    const tickX = this.xFromValue(tick);
    const useRTL = direction > 0 ? this.visualStateOn : !this.visualStateOn;
    this.driver.style.direction = useRTL ? 'rtl' : 'ltr';

    if (direction > 0) {
      Object.assign(this.driver.style, {
        left: `${left}px`,
        right: 'auto',
        width: `${Math.max(
          this.options.driverHeight + 2,
          2 * (tickX - left),
        )}px`,
      });
    } else {
      Object.assign(this.driver.style, {
        left: 'auto',
        right: `${this.surface.clientWidth - right}px`,
        width: `${Math.max(
          this.options.driverHeight + 2,
          2 * (right - tickX),
        )}px`,
      });
    }

    this.driver.style.height = `${Math.max(
      this.options.driverHeight,
      this.surface.clientHeight,
    )}px`;
    void this.driver.offsetWidth;
  }

  scheduleNormalTarget(tick, direction, mode = 'grid', echoBase = null) {
    clearTimeout(this.rearmTimer);
    this.rearmTimer = setTimeout(() => {
      this.targetTick = tick;
      this.targetMode = mode;
      this.echoBaseTick = echoBase;
      if (tick !== null) this.applyNormalTargetGeometry(tick, direction);
    }, this.options.rearmDelayMs);
  }

  armFirstNow() {
    if (
      this.activeTouchId === null ||
      this.movementDirection === 0 ||
      this.firstArmed
    ) {
      return;
    }

    this.firstArmed = true;
    this.targetTick = nextGridTick(
      this.currentValue,
      this.movementDirection,
      this.options,
    );
    this.targetMode = 'grid';
    this.applyFirstTargetGeometry(this.targetTick, this.movementDirection);
  }

  setDirectionBeforeFirst(direction) {
    this.movementDirection = direction;
    if (!this.parkingApplied && !this.firstArmed) this.applyParking(direction);

    if (this.firstArmed && !this.hasTicked) {
      this.targetTick = nextGridTick(this.currentValue, direction, this.options);
      this.targetMode = 'grid';
      this.applyFirstTargetGeometry(this.targetTick, direction);
    }
  }

  setDirectionAfterFirst(direction) {
    this.movementDirection = direction;
    this.targetMode = 'grid';
    this.targetTick = nextGridTick(this.currentValue, direction, this.options);
    this.applyNormalTargetGeometry(this.targetTick, direction);
  }

  handleTouchStart(event) {
    if (event.target !== this.driver || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const rect = this.surface.getBoundingClientRect();

    this.activeTouchId = touch.identifier;
    this.gestureStartedAt = performance.now();
    this.startClientX = touch.clientX;
    this.startLocalFull = touch.clientX - rect.left;
    this.previousTouchValue = this.valueFromPoint(touch.clientX, touch.clientY);
    this.emitValue(this.previousTouchValue, false);

    this.movementDirection = 0;
    this.parkingApplied = false;
    this.storedStartLocal = null;
    this.firstArmed = false;
    this.hasTicked = false;
    this.visualStateOn = false;
    this.targetTick = null;
    this.targetMode = 'grid';
    this.echoBaseTick = null;

    this.resetDriverFull();
    clearTimeout(this.armTimer);
    this.armTimer = setTimeout(
      () => this.armFirstNow(),
      this.options.firstArmMs,
    );
  }

  handleTouchMove(event) {
    if (this.activeTouchId === null) return;
    const touch = touchById(event.touches, this.activeTouchId);
    if (!touch) return;

    const nextValue = this.valueFromPoint(touch.clientX, touch.clientY);
    const delta = nextValue - this.previousTouchValue;
    this.emitValue(nextValue, false);

    if (Math.abs(delta) >= this.options.directionEpsilon) {
      const direction = Math.sign(delta);
      if (direction !== this.movementDirection) {
        if (this.hasTicked) this.setDirectionAfterFirst(direction);
        else this.setDirectionBeforeFirst(direction);
      }
    }

    if (
      !this.firstArmed &&
      this.movementDirection !== 0 &&
      performance.now() - this.gestureStartedAt >= this.options.firstArmMs
    ) {
      this.armFirstNow();
    }

    if (
      this.firstArmed &&
      crossed(
        this.previousTouchValue,
        nextValue,
        this.targetTick,
        this.movementDirection,
      )
    ) {
      this.processTick(this.targetTick);
    }

    this.previousTouchValue = nextValue;
  }

  processTick(hitTick) {
    if (hitTick === null) return;

    this.emitValue(this.currentValue, true);
    this.visualStateOn = !this.visualStateOn;
    this.hasTicked = true;

    if (this.targetMode === 'echo') {
      const baseTick = this.echoBaseTick ?? hitTick;
      this.options.onTick({
        value: baseTick,
        kind: 'major',
        phase: 'echo',
        direction: this.movementDirection,
        native: true,
      });
      const following = nextGridTick(
        baseTick + this.movementDirection * 0.01,
        this.movementDirection,
        this.options,
      );
      this.scheduleNormalTarget(following, this.movementDirection);
      return;
    }

    const major = Boolean(this.options.isMajor(hitTick));
    this.options.onTick({
      value: hitTick,
      kind: major ? 'major' : 'minor',
      phase: 'primary',
      direction: this.movementDirection,
      native: true,
    });

    if (major && this.options.accentOffset > 0) {
      const echoTarget = clamp(
        hitTick + this.movementDirection * this.options.accentOffset,
        this.options.min,
        this.options.max,
      );
      if (echoTarget !== hitTick) {
        this.scheduleNormalTarget(
          echoTarget,
          this.movementDirection,
          'echo',
          hitTick,
        );
        return;
      }
    }

    const following = nextGridTick(
      hitTick + this.movementDirection * 0.01,
      this.movementDirection,
      this.options,
    );
    this.scheduleNormalTarget(following, this.movementDirection);
  }

  finishTouch(event) {
    if (this.activeTouchId === null) return;
    if (touchById(event.touches, this.activeTouchId)) return;

    this.activeTouchId = null;
    clearTimeout(this.armTimer);
    clearTimeout(this.rearmTimer);

    setTimeout(() => {
      this.driver.checked = false;
      this.resetDriverFull();
    }, 140);
  }

  setValue(value) {
    this.value = clamp(Number(value), this.options.min, this.options.max);
    this.emitValue(this.value, false);
  }

  destroy() {
    clearTimeout(this.armTimer);
    clearTimeout(this.rearmTimer);
    this.abortController.abort();
  }
}
