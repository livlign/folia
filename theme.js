export const THEMES = [
  { id: 'paper', name: 'Paper', paper: '#f4efe6', accent: '#2f4f3e' },
  { id: 'light', name: 'Light', paper: '#ffffff', accent: '#2f6f54' },
  { id: 'sepia', name: 'Sepia', paper: '#f4ecd8', accent: '#8a5a2b' },
  { id: 'dark', name: 'Dark', paper: '#15140f', accent: '#9cc4ad' },
  { id: 'vintage', name: 'Vintage', paper: '#e7dabd', accent: '#8c4a2f' },
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
