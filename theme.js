// `swatch` = the surface colour shown in the picker chip; keep in sync with the
// matching [data-theme] block in styles.css (single visual identity per theme).
export const THEMES = [
  { id: 'paper', name: 'Paper', swatch: '#f7f1e3', accent: '#4a5d3a' },
  { id: 'light', name: 'Light', swatch: '#ffffff', accent: '#2f7d5b' },
  { id: 'sage', name: 'Sage', swatch: '#f1f5ee', accent: '#43694a' },
  { id: 'sepia', name: 'Sepia', swatch: '#f5ecd6', accent: '#9a5b25' },
  { id: 'vintage', name: 'Vintage', swatch: '#e7dbbd', accent: '#93472a' },
  { id: 'dusk', name: 'Dusk', swatch: '#222831', accent: '#8fb9d8' },
  { id: 'forest', name: 'Forest', swatch: '#1c2a22', accent: '#ceaa6a' },
  { id: 'night', name: 'Night', swatch: '#161613', accent: '#9ec79a' },
];

const KEY = 'folia-theme';
const DEFAULT = 'paper';

export function getTheme() {
  try {
    const id = localStorage.getItem(KEY);
    return THEMES.some((t) => t.id === id) ? id : DEFAULT;
  } catch (e) {
    return DEFAULT;
  }
}

export function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim();
    if (paper) meta.setAttribute('content', paper);
  }
}

export function setTheme(id) {
  try { localStorage.setItem(KEY, id); } catch (e) { /* private mode */ }
  applyTheme(id);
}
