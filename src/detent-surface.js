import { assertElement, prepareSwitch, touchById } from './utils.js';

const DETENT_DEFAULTS = {
  min: 0,
  max: 100,
  step: 5,
  value: 50,
  firstArmMs: 228,
  parkWidth: 1200,
  parkHeight: 100,
  driverHeight: 76,
  onValue: () => {},
  onTick: () => {},
};

export class ImmediateDetentSurface {
  constructor(options) {
    this.options = { ...DETENT_DEFAULTS, ...options };
    this.surface = this.options.surface;
    this.driver = this.options.driver;
    assertElement(this.surface, 'surface', HTMLElement);
    prepareSwitch(this.driver);

    this.activeTouchId = null;
    this.nativeReady = false;
    this.hasTicked = false;
    this.visualStateOn = false;
    this.startupEdge = 'right';
    this.storedStartLocal = null;
    this.armTimer = null;
    this.parkTimer = null;
  }

  resetDriver() {
    clearTimeout(this.parkTimer);
    Object.assign(this.driver.style, {
      left: '0px',
      right: 'auto',
      top: '0px',
      width: '100%',
      height: '100%',
      direction: 'ltr',
    });
    void this.driver.offsetWidth;
  }

  applyStartupParking(clientX) {
    const rect = this.surface.getBoundingClientRect();
    const localX = clientX - rect.left;
    const width = this.options.parkWidth;
    const startsLeft = localX < rect.width / 2;
    this.startupEdge = startsLeft ? 'left' : 'right';

    if (startsLeft) {
      this.storedStartLocal = 1;
      Object.assign(this.driver.style, {
        direction: 'rtl',
        left: `${localX - 1}px`,
      });
    } else {
      this.storedStartLocal = width - 1;
      Object.assign(this.driver.style, {
        direction: 'ltr',
        left: `${localX - (width - 1)}px`,
      });
    }

    Object.assign(this.driver.style, {
      right: 'auto',
      top: '0px',
      width: `${width}px`,
      height: `${Math.max(this.options.parkHeight, this.surface.clientHeight)}px`,
    });
    void this.driver.offsetWidth;
  }

  triggerFirstAt(clientX) {
    const rect = this.surface.getBoundingClientRect();
    const localX = clientX - rect.left;
    const width = this.options.parkWidth;
    const stored = this.storedStartLocal ?? width - 1;

    if (this.startupEdge === 'left') {
      const changePosition = stored - 0.4 * width;
      const targetLocal = changePosition - 2;
      const height = Math.max(
        20,
        Math.min(this.surface.clientHeight, width - stored - 12),
      );
      Object.assign(this.driver.style, {
        direction: 'rtl',
        left: `${localX - targetLocal}px`,
        width: `${width}px`,
        height: `${height}px`,
      });
    } else {
      const changePosition = stored + 0.4 * width;
      const targetLocal = changePosition + 2;
      Object.assign(this.driver.style, {
        direction: 'ltr',
        left: `${localX - targetLocal}px`,
        width: `${width}px`,
        height: `${Math.max(
          this.surface.clientHeight,
          width - stored + 12,
        )}px`,
      });
    }

    void this.driver.offsetWidth;
  }

  triggerNormalAt(clientX) {
    const rect = this.surface.getBoundingClientRect();
    const localX = clientX - rect.left;
    const width = Math.max(420, this.surface.clientWidth + 96);
    const midpoint = localX + (this.visualStateOn ? 2 : -2);

    Object.assign(this.driver.style, {
      direction: 'ltr',
      left: `${midpoint - width / 2}px`,
      right: 'auto',
      top: '0px',
      width: `${width}px`,
      height: `${Math.max(this.options.driverHeight, this.surface.clientHeight)}px`,
    });
    void this.driver.offsetWidth;
  }

  parkForState(clientX) {
    const rect = this.surface.getBoundingClientRect();
    const localX = clientX - rect.left;
    const width = this.options.parkWidth;
    const left = this.visualStateOn ? localX - (width - 1) : localX - 1;

    Object.assign(this.driver.style, {
      direction: 'ltr',
      left: `${left}px`,
      right: 'auto',
      top: '0px',
      width: `${width}px`,
      height: `${Math.max(this.options.parkHeight, this.surface.clientHeight)}px`,
    });
    void this.driver.offsetWidth;
  }

  triggerNative(clientX) {
    if (!this.nativeReady) return false;
    if (this.hasTicked) this.triggerNormalAt(clientX);
    else {
      this.triggerFirstAt(clientX);
      this.hasTicked = true;
    }

    this.visualStateOn = !this.visualStateOn;
    clearTimeout(this.parkTimer);
    this.parkTimer = setTimeout(() => {
      if (this.activeTouchId !== null) this.parkForState(clientX);
    }, 0);
    return true;
  }

  startNative(touch) {
    this.activeTouchId = touch.identifier;
    this.nativeReady = false;
    this.hasTicked = false;
    this.visualStateOn = false;
    this.driver.checked = false;
    this.applyStartupParking(touch.clientX);
    clearTimeout(this.armTimer);
    this.armTimer = setTimeout(() => {
      if (this.activeTouchId !== null) this.nativeReady = true;
    }, this.options.firstArmMs);
  }

  finishNative(event) {
    if (this.activeTouchId === null) return false;
    if (touchById(event.touches, this.activeTouchId)) return false;

    this.activeTouchId = null;
    this.nativeReady = false;
    clearTimeout(this.armTimer);
    clearTimeout(this.parkTimer);
    setTimeout(() => {
      this.driver.checked = false;
      this.resetDriver();
    }, 120);
    return true;
  }
}
