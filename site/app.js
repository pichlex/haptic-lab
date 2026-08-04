import {
  HapticDial,
  HapticRange,
  HapticXYPad,
  bindHapticTap,
  bindHapticToggle,
  isFinePointer,
  isTouchCapable,
} from '../src/index.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

if (isFinePointer() && !isTouchCapable()) {
  document.documentElement.classList.add('fine-pointer');
}

function replay(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function buildTicks(container, step, majorEvery) {
  const count = Math.round(100 / step) + 1;
  container.style.gridTemplateColumns = `repeat(${count}, minmax(0, 1fr))`;

  for (let value = 0; value <= 100 + 0.0001; value += step) {
    const tick = document.createElement('span');
    tick.className = 'range-tick';
    tick.dataset.value = String(Number(value.toFixed(4)));
    if (Math.abs(value % majorEvery) < 0.0001) tick.classList.add('major');
    container.append(tick);
  }
}

function pulseNearestTick(container, value, phase = 'primary') {
  let nearest = null;
  let distance = Infinity;

  for (const tick of $$('.range-tick', container)) {
    const nextDistance = Math.abs(Number(tick.dataset.value) - value);
    if (nextDistance < distance) {
      nearest = tick;
      distance = nextDistance;
    }
  }

  if (!nearest) return;
  replay(nearest, phase === 'echo' ? 'echo' : 'hit');
}

function setupSlider(card, options) {
  const surface = $('.range-surface', card);
  const driver = $('.range-driver', card);
  const fill = $('.range-fill', card);
  const thumb = $('.range-thumb', card);
  const ticks = $('.range-ticks', card);
  const output = $('.value', card);

  buildTicks(ticks, options.step, options.majorEvery);

  const control = new HapticRange({
    surface,
    driver,
    min: 0,
    max: 100,
    step: options.step,
    value: options.value,
    trackInset: 16,
    accentOffset: options.accentOffset ?? 0,
    isMajor: (value) => Math.abs(value % options.majorEvery) < 0.0001,
    onValue: ({ value, ratio, animate }) => {
      const rect = surface.getBoundingClientRect();
      const usable = Math.max(1, rect.width - 32);
      const x = 16 + usable * ratio;
      fill.style.width = `${usable * ratio}px`;
      thumb.style.left = `${x}px`;
      output.textContent = String(Math.round(value));
      if (animate) replay(thumb, 'hit');
    },
    onTick: ({ value, phase }) => pulseNearestTick(ticks, value, phase),
  });

  surface.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let value = control.currentValue;
    if (event.key === 'ArrowLeft') value -= options.step;
    if (event.key === 'ArrowRight') value += options.step;
    if (event.key === 'Home') value = 0;
    if (event.key === 'End') value = 100;
    control.setValue(value);
  });

  return control;
}

const sliderControls = {
  coarse: setupSlider($('[data-slider="coarse"]'), {
    step: 10,
    majorEvery: 20,
    value: 50,
  }),
  dense: setupSlider($('[data-slider="dense"]'), {
    step: 2,
    majorEvery: 10,
    value: 42,
  }),
  accent: setupSlider($('[data-slider="accent"]'), {
    step: 5,
    majorEvery: 20,
    accentOffset: 1.35,
    value: 35,
  }),
};

function setupDirectTap(root, callback) {
  const input = $('.native-overlay', root);
  bindHapticTap(input, callback);

  root.addEventListener('click', (event) => {
    if (event.target === input) return;
    callback({ event, checked: input.checked });
  });
}

setupDirectTap($('.preview-button'), () => replay($('.preview-button'), 'is-hit'));

const tabs = $$('.tab');
const tabIndicator = $('.tab-indicator');
const tabPanel = $('.tab-panel');
const tabCopy = [
  ['One motion language', 'Every control reacts quickly, then gets out of the way.'],
  ['Motion with restraint', 'The animation explains the state change without taking over the page.'],
  ['Physical feedback', 'Supported iPhones add a short tactile response.'],
];

function selectTab(index) {
  $('.tabs').style.setProperty('--index', String(index));
  tabs.forEach((tab, itemIndex) => {
    const active = index === itemIndex;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  const [title, copy] = tabCopy[index];
  $('strong', tabPanel).textContent = title;
  $('p', tabPanel).textContent = copy;
  replay(tabIndicator, 'is-moving');
}

tabs.forEach((tab, index) => setupDirectTap(tab, () => selectTab(index)));

let actions = 0;
const actionButton = $('#action-button');
setupDirectTap(actionButton, () => {
  actions += 1;
  $('#action-count').textContent = `${actions} ${actions === 1 ? 'action' : 'actions'}`;
  replay(actionButton, 'is-hit');
});

const toggle = $('#toggle');
const toggleDriver = $('#toggle-driver');
function renderToggle(checked) {
  toggle.classList.toggle('is-on', checked);
  toggle.setAttribute('aria-checked', String(checked));
  $('#toggle-label').textContent = checked ? 'On' : 'Off';
  document.body.classList.toggle('ambience-on', checked);
}

bindHapticToggle(toggleDriver, ({ checked }) => renderToggle(checked));

toggle.addEventListener('click', (event) => {
  if (event.target === toggleDriver) return;
  toggleDriver.checked = !toggleDriver.checked;
  renderToggle(toggleDriver.checked);
});

toggle.addEventListener('keydown', (event) => {
  if (![' ', 'Enter'].includes(event.key)) return;
  event.preventDefault();
  toggleDriver.checked = !toggleDriver.checked;
  renderToggle(toggleDriver.checked);
});

const dialRoot = $('#dial');
const dialRing = $('.dial-ring', dialRoot);
const dialPointer = $('.dial-pointer', dialRoot);
const dialOutput = $('output', dialRoot);

const dial = new HapticDial({
  surface: dialRoot,
  driver: $('.dial-driver', dialRoot),
  min: 0,
  max: 100,
  step: 5,
  value: 64,
  arcStart: -135,
  arcEnd: 135,
  isMajor: (value) => value % 25 === 0,
  onValue: ({ value, ratio, animate }) => {
    const angle = -135 + ratio * 270;
    dialOutput.textContent = String(Math.round(value));
    dialPointer.style.transform = `rotate(${angle}deg)`;
    dialRing.style.setProperty('--progress', `${ratio * 270}deg`);
    if (animate) replay(dialRing, 'hit');
  },
  onTick: () => {},
});

dialRoot.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  let value = dial.value;
  if (['ArrowLeft', 'ArrowDown'].includes(event.key)) value -= 5;
  if (['ArrowRight', 'ArrowUp'].includes(event.key)) value += 5;
  if (event.key === 'Home') value = 0;
  if (event.key === 'End') value = 100;
  dial.setValue(value);
});

const xyRoot = $('#xy-pad');
const xyOrb = $('.xy-orb', xyRoot);
const xyCell = $('.xy-cell', xyRoot);

const xyPad = new HapticXYPad({
  surface: xyRoot,
  driver: $('.xy-driver', xyRoot),
  columns: 10,
  rows: 8,
  x: 52,
  y: 46,
  onValue: ({ x, y, ratioX, ratioY, cellX, cellY, animate }) => {
    xyRoot.style.setProperty('--x', `${ratioX * 100}%`);
    xyRoot.style.setProperty('--y', `${ratioY * 100}%`);
    xyRoot.style.setProperty('--cell-x', String(cellX));
    xyRoot.style.setProperty('--cell-y', String(cellY));
    $('.xy-x', xyRoot).textContent = String(Math.round(x));
    $('.xy-y', xyRoot).textContent = String(Math.round(100 - y));
    if (animate) {
      replay(xyOrb, 'hit');
      replay(xyCell, 'hit');
    }
  },
  onTick: () => {
    replay(xyOrb, 'hit');
    replay(xyCell, 'hit');
  },
});

for (const anchor of $$('a[href^="#"]')) {
  anchor.addEventListener('click', (event) => {
    const target = $(anchor.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

window.hapticLab = {
  ...sliderControls,
  dial,
  xyPad,
};
