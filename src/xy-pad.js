import { ImmediateDetentSurface } from './detent-surface.js';
import {
  clamp,
  gridCell,
  isFinePointer,
  isTouchCapable,
  touchById,
} from './utils.js';

export class HapticXYPad extends ImmediateDetentSurface {
  constructor(options) {
    super({ columns: 10, rows: 8, x: 52, y: 46, ...options });
    this.x = clamp(Number(this.options.x), 0, 100);
    this.y = clamp(Number(this.options.y), 0, 100);
    this.cellX = gridCell(this.x, this.options.columns);
    this.cellY = gridCell(this.y, this.options.rows);
    this.activePointerId = null;
    this.desktopDrag = false;
    this.abortController = new AbortController();
    this.signal = this.abortController.signal;

    this.syncPointerMode();
    this.bind();
    this.resetDriver();
    this.emit(false);
  }

  syncPointerMode() {
    const desktopOnly = isFinePointer() && !isTouchCapable();
    this.surface.classList.toggle('is-fine-pointer', desktopOnly);
    this.driver.style.pointerEvents = desktopOnly ? 'none' : 'auto';
  }

  point(clientX, clientY) {
    const rect = this.surface.getBoundingClientRect();
    return {
      x: clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1) * 100,
      y: clamp((clientY - rect.top) / Math.max(1, rect.height), 0, 1) * 100,
    };
  }

  emit(animate) {
    this.options.onValue({
      x: this.x,
      y: this.y,
      ratioX: this.x / 100,
      ratioY: this.y / 100,
      cellX: gridCell(this.x, this.options.columns),
      cellY: gridCell(this.y, this.options.rows),
      animate,
    });
  }

  updatePoint(point, source, native = false) {
    const nextCellX = gridCell(point.x, this.options.columns);
    const nextCellY = gridCell(point.y, this.options.rows);
    const crossedX = nextCellX !== this.cellX;
    const crossedY = nextCellY !== this.cellY;
    const crossedGrid = crossedX || crossedY;

    this.x = point.x;
    this.y = point.y;
    this.emit(crossedGrid);

    if (crossedGrid) {
      this.options.onTick({
        x: this.x,
        y: this.y,
        cellX: nextCellX,
        cellY: nextCellY,
        crossedX,
        crossedY,
        axis: crossedX && crossedY ? 'xy' : crossedX ? 'x' : 'y',
        source,
        native,
      });
    }

    this.cellX = nextCellX;
    this.cellY = nextCellY;
    return crossedGrid;
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
        const point = this.point(event.clientX, event.clientY);
        this.x = point.x;
        this.y = point.y;
        this.cellX = gridCell(this.x, this.options.columns);
        this.cellY = gridCell(this.y, this.options.rows);
        this.emit(false);
      },
      { signal: this.signal },
    );

    window.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerId !== this.activePointerId || !this.desktopDrag) return;
        this.updatePoint(this.point(event.clientX, event.clientY), 'desktop');
      },
      { capture: true, signal: this.signal },
    );

    const finishPointer = (event) => {
      if (event.pointerId !== this.activePointerId) return;
      this.surface.classList.remove('is-dragging');
      try {
        this.surface.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional.
      }
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
        const point = this.point(touch.clientX, touch.clientY);
        this.x = point.x;
        this.y = point.y;
        this.cellX = gridCell(this.x, this.options.columns);
        this.cellY = gridCell(this.y, this.options.rows);
        this.emit(false);
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
        const point = this.point(touch.clientX, touch.clientY);
        const nextCellX = gridCell(point.x, this.options.columns);
        const nextCellY = gridCell(point.y, this.options.rows);
        const crossedGrid = nextCellX !== this.cellX || nextCellY !== this.cellY;
        const native = crossedGrid ? this.triggerNative(touch.clientX) : false;
        this.updatePoint(point, 'touch', native);
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

    this.surface.addEventListener(
      'keydown',
      (event) => {
        const stepX = 100 / this.options.columns;
        const stepY = 100 / this.options.rows;
        let x = this.x;
        let y = this.y;
        if (event.key === 'ArrowLeft') x -= stepX;
        else if (event.key === 'ArrowRight') x += stepX;
        else if (event.key === 'ArrowUp') y -= stepY;
        else if (event.key === 'ArrowDown') y += stepY;
        else return;
        event.preventDefault();
        this.updatePoint(
          { x: clamp(x, 0, 100), y: clamp(y, 0, 100) },
          'keyboard',
        );
      },
      { signal: this.signal },
    );
  }

  destroy() {
    this.abortController.abort();
    clearTimeout(this.armTimer);
    clearTimeout(this.parkTimer);
  }
}
