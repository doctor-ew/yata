export const RETRO_EFFECTS_STORAGE_KEY = 'yata.retro-effects.v1';
const PULSE_DURATION_MS = 180;

// Decorative layers stay inside the existing shell; provider players never move.
export function mountRetroEffects({ body, shell, screenToggle, staticToggle, storage }) {
  const documentRef = shell.ownerDocument || body.ownerDocument;
  const view = documentRef.defaultView;
  const reducedMotion = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const forcedColors = view?.matchMedia?.('(forced-colors: active)');
  const startTimer = view?.setTimeout ? view.setTimeout.bind(view) : setTimeout;
  const clearTimer = view?.clearTimeout ? view.clearTimeout.bind(view) : clearTimeout;
  let preferences = { crt: false, static: false }, timer = null, animation = null, disposed = false;
  try {
    const saved = JSON.parse(storage?.getItem(RETRO_EFFECTS_STORAGE_KEY) || 'null');
    if (saved && !Array.isArray(saved) && typeof saved.crt === 'boolean' && typeof saved.static === 'boolean') {
      preferences = { crt: saved.crt, static: saved.static };
    }
  } catch { /* Presentation remains usable when storage is unavailable. */ }
  const overlay = documentRef.createElement('div');
  overlay.className = 'retro-static'; overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true'); shell.append(overlay);

  function stopPulse() {
    if (timer !== null) clearTimer(timer);
    timer = null; animation?.cancel(); animation = null;
    overlay.hidden = true; shell.classList.toggle('retro-static-active', false);
  }
  function reflect() {
    body.classList.toggle('crt-mode', preferences.crt);
    screenToggle.checked = preferences.crt; staticToggle.checked = preferences.static;
  }
  function save() {
    try { storage?.setItem(RETRO_EFFECTS_STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Optional preference persistence. */ }
  }
  const changeCrt = () => { preferences.crt = screenToggle.checked === true; reflect(); save(); };
  const changeStatic = () => {
    preferences.static = staticToggle.checked === true;
    if (!preferences.static) stopPulse();
    reflect(); save();
  };
  const mediaChanged = () => { if (reducedMotion?.matches || forcedColors?.matches) stopPulse(); };
  const media = [reducedMotion, forcedColors].filter(Boolean);
  for (const query of media) query.addEventListener?.('change', mediaChanged);
  screenToggle.addEventListener('change', changeCrt); staticToggle.addEventListener('change', changeStatic);
  reflect();
  return {
    pulse() {
      if (disposed || !preferences.static || reducedMotion?.matches || forcedColors?.matches) return false;
      stopPulse(); overlay.hidden = false; shell.classList.toggle('retro-static-active', true);
      // A single low-contrast fade, never a full-screen white/black flash or sound.
      animation = overlay.animate?.([
        { opacity: .16, backgroundPosition: '0px 0px' },
        { opacity: 0, backgroundPosition: '13px 7px' },
      ], { duration: PULSE_DURATION_MS, iterations: 1, easing: 'ease-out' }) || null;
      timer = startTimer(stopPulse, PULSE_DURATION_MS);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true; stopPulse(); body.classList.toggle('crt-mode', false);
      screenToggle.removeEventListener('change', changeCrt); staticToggle.removeEventListener('change', changeStatic);
      for (const query of media) query.removeEventListener?.('change', mediaChanged);
      overlay.remove();
    },
  };
}
