// All self-hosted and Vietnamese-capable, spanning soft → rigid: Newsreader and
// Lora (serifs), Roboto Slab (slab — the middle ground), Source Sans 3
// (humanist sans), and Spline Sans Mono. All variable except Mono, so the
// weight control applies smoothly.
export const FONTS = [
  { id: 'newsreader', name: 'Newsreader', stack: "'Newsreader', Georgia, serif" },
  { id: 'lora', name: 'Lora', stack: "'Lora', Georgia, serif" },
  { id: 'slab', name: 'Slab', stack: "'Roboto Slab', Georgia, serif" },
  { id: 'sans', name: 'Sans', stack: "'Source Sans 3', system-ui, sans-serif" },
  { id: 'mono', name: 'Mono', stack: "'Spline Sans Mono', ui-monospace, 'SF Mono', Menlo, monospace" },
];

// Steps spaced wide enough to read as distinct (400→600→800). Fully honoured by
// the variable Newsreader; system fonts snap to their nearest available weight.
export const WEIGHTS = [
  { id: 'regular', name: 'Regular', value: '400' },
  { id: 'semibold', name: 'Semibold', value: '600' },
  { id: 'bold', name: 'Bold', value: '800' },
];

export const STYLES = [
  { id: 'normal', name: 'Normal', value: 'normal' },
  { id: 'italic', name: 'Italic', value: 'italic' },
];

// Discrete, bounded reading sizes — the page layout adapts live (pagination
// measures the real viewport), so these only change how much fits per screen.
export const SIZES = [
  { id: 'small', name: 'Small', value: '1.05rem' },
  { id: 'medium', name: 'Medium', value: '1.2rem' },
  { id: 'large', name: 'Large', value: '1.35rem' },
  { id: 'xlarge', name: 'X-Large', value: '1.55rem' },
];

const KEYS = { font: 'folia-font', weight: 'folia-weight', style: 'folia-style', size: 'folia-size' };
const DEFAULTS = { font: 'newsreader', weight: 'regular', style: 'normal', size: 'medium' };
const LISTS = { font: FONTS, weight: WEIGHTS, style: STYLES, size: SIZES };

function read(axis) {
  try {
    const v = localStorage.getItem(KEYS[axis]);
    return LISTS[axis].some((o) => o.id === v) ? v : DEFAULTS[axis];
  } catch (e) {
    return DEFAULTS[axis];
  }
}

export function getType() {
  return { font: read('font'), weight: read('weight'), style: read('style'), size: read('size') };
}

export function applyType(t = getType()) {
  const s = document.documentElement.style;
  s.setProperty('--body-font', FONTS.find((f) => f.id === t.font).stack);
  s.setProperty('--body-weight', WEIGHTS.find((w) => w.id === t.weight).value);
  s.setProperty('--body-style', STYLES.find((y) => y.id === t.style).value);
  s.setProperty('--body-size', SIZES.find((z) => z.id === t.size).value);
}

export function setType(patch) {
  for (const axis of Object.keys(patch)) {
    try { localStorage.setItem(KEYS[axis], patch[axis]); } catch (e) { /* private mode */ }
  }
  applyType();
}
