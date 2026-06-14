// Captures the Android/Chromium install prompt so the app can offer an explicit
// "Install" button (more reliable than the browser menu, and it reports the
// outcome instead of failing silently). No-op on browsers without the event.
let deferred = null;
let installed = false;
const listeners = new Set();

function emit() { listeners.forEach((fn) => fn()); }

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  emit();
});
window.addEventListener('appinstalled', () => {
  installed = true;
  deferred = null;
  emit();
});

export function canInstall() { return !!deferred && !installed; }

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export async function promptInstall() {
  if (!deferred) return null;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  if (outcome === 'accepted') { deferred = null; emit(); }
  return outcome;
}
