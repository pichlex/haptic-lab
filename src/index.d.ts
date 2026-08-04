export type TickKind = 'minor' | 'major';
export type TickPhase = 'primary' | 'echo';

export interface RangeValueEvent {
  value: number;
  ratio: number;
  animate: boolean;
}

export interface RangeTickEvent {
  value: number;
  kind: TickKind;
  phase?: TickPhase;
  direction: number;
  native: boolean;
}

export interface HapticRangeOptions {
  surface: HTMLElement;
  driver: HTMLInputElement;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  trackInset?: number;
  driverHeight?: number;
  firstArmMs?: number;
  accentOffset?: number;
  isMajor?: (value: number) => boolean;
  pointToValue?: (context: {
    clientX: number;
    clientY: number;
    surface: HTMLElement;
    min: number;
    max: number;
  }) => number;
  xForValue?: (context: {
    value: number;
    surface: HTMLElement;
    min: number;
    max: number;
  }) => number;
  onValue?: (event: RangeValueEvent) => void;
  onTick?: (event: RangeTickEvent) => void;
  onDebug?: (event: Record<string, unknown>) => void;
}

export class HapticRange {
  constructor(options: HapticRangeOptions);
  currentValue: number;
  setValue(value: number): void;
  destroy(): void;
}

export interface XYValueEvent {
  x: number;
  y: number;
  ratioX: number;
  ratioY: number;
  cellX: number;
  cellY: number;
  animate: boolean;
}

export interface XYTickEvent {
  x: number;
  y: number;
  cellX: number;
  cellY: number;
  crossedX: boolean;
  crossedY: boolean;
  axis: 'x' | 'y' | 'xy';
  source: 'desktop' | 'touch' | 'keyboard';
  native: boolean;
}

export interface HapticXYPadOptions {
  surface: HTMLElement;
  driver: HTMLInputElement;
  columns?: number;
  rows?: number;
  x?: number;
  y?: number;
  firstArmMs?: number;
  onValue?: (event: XYValueEvent) => void;
  onTick?: (event: XYTickEvent) => void;
}

export class HapticXYPad {
  constructor(options: HapticXYPadOptions);
  x: number;
  y: number;
  destroy(): void;
}

export interface HapticDialOptions {
  surface: HTMLElement;
  driver: HTMLInputElement;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  arcStart?: number;
  arcEnd?: number;
  firstArmMs?: number;
  isMajor?: (value: number) => boolean;
  onValue?: (event: RangeValueEvent) => void;
  onTick?: (event: Omit<RangeTickEvent, 'phase'>) => void;
}

export class HapticDial {
  constructor(options: HapticDialOptions);
  value: number;
  setValue(value: number): void;
  destroy(): void;
}

export function bindHapticTap(
  input: HTMLInputElement,
  callback?: (event: { event: Event; checked: boolean }) => void,
): () => void;

export function bindHapticToggle(
  input: HTMLInputElement,
  callback?: (event: { event: Event; checked: boolean }) => void,
): () => void;

export function clamp(value: number, minimum: number, maximum: number): number;
export function quantize(value: number, step: number, origin?: number): number;
export function gridCell(value: number, count: number): number;
export function angleToRatio(angle: number, start?: number, end?: number): number;
export function isTouchCapable(): boolean;
export function isFinePointer(): boolean;
