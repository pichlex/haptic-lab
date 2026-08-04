import { ImmediateDetentSurface } from './detent-surface.js';
import {
  angleToRatio,
  clamp,
  isFinePointer,
  isTouchCapable,
  listCrossedTicks,
  touchById,
} from './utils.js';

export class HapticDial extends ImmediateDetentSurface {
  constructor(options) {
    super({ arcStart: -135, arcEnd: 135, ...options });
    this.value = clamp(Number(this.options.value), this.options.min, this.options.max);
    this.previousValue = this.value;
    this.activePointerId = null;
    this.desktopDrag = false;
    this.abortController = new AbortController();
    this.signal = this.abortController.signal;

    this.syncPointerMode();
    this.bind();
    this.resetDriver();
    this.emit(this.value, false);
  }

  syncPointerMode() {
    const desktopOnly = isFinePointer() && !isTouchCapable();
    this.surface.classList.toggle('is-fine-pointer', desktopOnly);
    this.driver.style.pointerEvents = desktopOnly ? 'none' : 'auto';
  }

  valueFromPoint(clientX, clientY) {
    const rect = this.surface.getBoundingClientRect();
    const x = clientX - (rect.left + rect.width / 2);
    const y = clientY - (rect.top + rect.height / 2);
    const angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    const ratio = angleToRatio(angle, this.options.arcStart, this.options.arcEnd);
    return this.options.min + ratio * (this.options.max - this.options.min);
  }

  emit(value, animate) {
    this.value = clamp(value, this.options.min, this.options.max);
    this.options.onValue({
      value: this.value,
      ratio: (this.value - this.options.min) / (this.options.max - this.options.min),
      animate,
    });
  }

  update(value, source, clientX = null) {
    const previous = this.value;
    this.emit(value, false);
    const ticks = listCrossedTicks(previous, this.value, this.options);

    for (const tick of ticks) {
      const direction = Math.sign(this.value - previous);
      const native =
        source === 'touch' && clientX !== null ? this.triggerNative(clientX) : false;
      this.options.onTick({
        value: tick,
        kind: this.options.isMajor(tick) ? 'major' : 'minor',
        direction,
        native,
      });
      this.emit(this.value, true);
    }
  }

  bind() {
    this.surface.addEventListener(
      'pointerdown',
      (event) => {
        if (event.pointerType === 'touch') return;
        if (event.button !== 0 || !this.surface.contains(event.target)) return;
        event.preventDefault();
        this.desktopDrag = true;
        this.activePointerId = event.pointerId;
        this.surface.classList.add('is-dragging');
        try {
          this.surface.setPointerCapture(event.pointerId);
        } catch {
          // Pointer capture is optional.
        }
        this.update(this.valueFromPoint(event.clientX, event.clientY), 'desktop');
      },
      { signal: this.signal },
    );

    window.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerId !== this.activePointerId || !this.desktopDrag) return;
        this.update(this.valueFromPoint(event.clientX, event.clientY), 'desktop');
      },
      { capture: true, signal: this.signal },
    );

    const finishPointer = (event) => {
      if (event.pointerId !== this.activePointerId) return;
      this.surface.classList.remove('is-dragging');
      this.desktopDrag = false;
      this.activePointerId = null;
    };
    window.addEventListener('pointerup', finishPointer, {
      capture: true,
      signal: this.signal,
    });
    window.addEventListener('pointercancel', finishPointer, {
      capture: true,
      signal: this.signal,
    });

    this.surface.addEventListener(
      'touchstart',
      (event) => {
        if (event.target !== this.driver || event.touches.length !== 1) return;
        const touch = event.touches[0];
        this.emit(this.valueFromPoint(touch.clientX, touch.clientY), false);
        this.startNative(touch);
      },
      { capture: true, passive: true, signal: this.signal },
    );

    this.surface.addEventListener(
      'touchmove',
      (event) => {
        if (this.activeTouchId === null) return;
        const touch = touchById(event.touches, this.activeTouchId);
        if (!touch) return;
        this.update(
          this.valueFromPoint(touch.clientX, touch.clientY),
          'touch',
          touch.clientX,
        );
      },
      { capture: true, passive: true, signal: this.signal },
    );

    const finishTouch = (event) => this.finishNative(event);
    this.surface.addEventListener('touchend', finishTouch, {
      capture: true,
      passive: true,
      signal: this.signal,
    });
    this.surface.addEventListener('touchcancel', finishTouch, {
      capture: true,
      passive: true,
      signal: this.signal,
    });
  }

  setValue(value) {
    this.emit(value, false);
  }

  destroy() {
    this.abortController.abort();
    clearTimeout(this.armTimer);
    clearTimeout(this.parkTimer);
  }
}
