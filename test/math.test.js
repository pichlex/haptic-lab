import test from 'node:test';
import assert from 'node:assert/strict';
import { angleToRatio, clamp, gridCell, quantize } from '../src/index.js';

test('clamp bounds values', () => {
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(12, 0, 10), 10);
  assert.equal(clamp(4, 0, 10), 4);
});

test('quantize snaps to the requested step', () => {
  assert.equal(quantize(24, 10), 20);
  assert.equal(quantize(26, 10), 30);
  assert.equal(quantize(7, 5, 2), 7);
});

test('gridCell handles both edges', () => {
  assert.equal(gridCell(0, 10), 0);
  assert.equal(gridCell(99.9, 10), 9);
  assert.equal(gridCell(100, 10), 9);
});

test('angleToRatio maps the dial arc', () => {
  assert.equal(angleToRatio(-135), 0);
  assert.equal(angleToRatio(0), 0.5);
  assert.equal(angleToRatio(135), 1);
});
