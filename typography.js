export const FONTS = [
  { id: 'newsreader', name: 'Newsreader', stack: "'Newsreader', Georgia, 'Times New Roman', serif" },
  { id: 'georgia', name: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
  { id: 'palatino', name: 'Palatino', stack: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" },
  { id: 'sans', name: 'Sans', stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: 'mono', name: 'Mono', stack: "'Spline Sans Mono', ui-monospace, 'SF Mono', Menlo, monospace" },
];

export const WEIGHTS = [
  { id: 'regular', name: 'Regular', value: '400' },
  { id: 'medium', name: 'Medium', value: '500' },
  { id: 'semibold', name: 'Semibold', value: '600' },
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
