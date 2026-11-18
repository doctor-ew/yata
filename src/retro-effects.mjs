export const RETRO_EFFECTS_STORAGE_KEY = 'yata.retro-effects.v1';
const DEFAULTS = { crt: true, static: true, theme: '80s', staticLevel: 12, staticDuration: 240, staticMode: 'tuning' };
const THEMES = ['none', '70s', '80s', '90s'];
const bounded = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

// Decorative layers stay inside the existing shell; provider players never move.
export function mountRetroEffects({ body, shell, screenToggle, staticToggle, storage, cabinet, themeSelect, levelInput, durationInput, modeSelect, previewButton, levelOutput, durationOutput }) {
  const documentRef = shell.ownerDocument || body.ownerDocument;
  const view = documentRef.defaultView;
  const reducedMotion = view?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const forcedColors = view?.matchMedia?.('(forced-colors: active)');
  const startTimer = view?.setTimeout ? view.setTimeout.bind(view) : setTimeout;
  const clearTimer = view?.clearTimeout ? view.clearTimeout.bind(view) : clearTimeout;
  let preferences = { ...DEFAULTS }, timer = null, animation = null, disposed = false;
  try {
    const saved = JSON.parse(storage?.getItem(RETRO_EFFECTS_STORAGE_KEY) || 'null');
    if (saved && !Array.isArray(saved) && typeof saved.crt === 'boolean' && typeof saved.static === 'boolean') {
      preferences = { crt: saved.crt, static: saved.static,
        theme: THEMES.includes(saved.theme) ? saved.theme : DEFAULTS.theme,
        staticLevel: bounded(saved.staticLevel, 0, 30, DEFAULTS.staticLevel),
        staticDuration: bounded(saved.staticDuration, 80, 800, DEFAULTS.staticDuration),
        staticMode: saved.staticMode === 'continuous' ? 'continuous' : 'tuning' };
    }
  } catch { /* Presentation remains usable when storage is unavailable. */ }
  const overlay = documentRef.createElement('div');
  overlay.className = 'retro-static'; overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true'); shell.append(overlay);
  const suppressed = () => reducedMotion?.matches || forcedColors?.matches;
  const enabled = () => preferences.static && preferences.staticLevel > 0 && !suppressed();
  function reflectNoise() {
    const continuous = !disposed && enabled() && preferences.staticMode === 'continuous';
    overlay.classList.toggle('retro-static-continuous', continuous);
    overlay.hidden = timer === null && !continuous;
    shell.classList.toggle('retro-static-active', !overlay.hidden);
  }
  function stopPulse() {
    if (timer !== null) clearTimer(timer);
    timer = null; animation?.cancel(); animation = null;
    overlay.classList.toggle('retro-static-channel-change', false);
    reflectNoise();
  }
  function reflect() {
    body.classList.toggle('crt-mode', preferences.crt);
    cabinet?.setAttribute('data-theme', preferences.theme);
    screenToggle.checked = preferences.crt; staticToggle.checked = preferences.static;
    if (themeSelect) themeSelect.value = preferences.theme;
    if (levelInput) levelInput.value = String(preferences.staticLevel);
    if (durationInput) durationInput.value = String(preferences.staticDuration);
    if (modeSelect) modeSelect.value = preferences.staticMode;
    if (levelOutput) levelOutput.textContent = `${preferences.staticLevel}%`;
    if (durationOutput) durationOutput.textContent = `${preferences.staticDuration} ms`;
    if (previewButton) previewButton.disabled = !enabled();
    overlay.style.setProperty('--static-opacity', String(preferences.staticLevel / 100));
    reflectNoise();
  }
  function save() {
    try { storage?.setItem(RETRO_EFFECTS_STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Optional preference persistence. */ }
  }
  function update(key, value) { preferences[key] = value; stopPulse(); reflect(); save(); }
  const listeners = [];
  function listen(element, event, callback) { if (element) { element.addEventListener(event, callback); listeners.push([element, event, callback]); } }
  listen(screenToggle, 'change', () => update('crt', screenToggle.checked === true));
  listen(staticToggle, 'change', () => update('static', staticToggle.checked === true));
  listen(themeSelect, 'change', () => update('theme', THEMES.includes(themeSelect.value) ? themeSelect.value : DEFAULTS.theme));
  listen(levelInput, 'input', () => update('staticLevel', bounded(Number(levelInput.value), 0, 30, DEFAULTS.staticLevel)));
  listen(durationInput, 'input', () => update('staticDuration', bounded(Number(durationInput.value), 80, 800, DEFAULTS.staticDuration)));
  listen(modeSelect, 'change', () => update('staticMode', modeSelect.value === 'continuous' ? 'continuous' : 'tuning'));
  function pulse({ force = false, transition = false } = {}) {
    if (disposed || suppressed() || preferences.staticLevel <= 0 || (!force && !preferences.static)) return false;
    stopPulse(); overlay.hidden = false; shell.classList.toggle('retro-static-active', true);
    // Channel snow holds a steady grey field, then clears; playback is never delayed.
    overlay.classList.toggle('retro-static-channel-change', transition);
    animation = overlay.animate?.(transition ? [
      { opacity: 1, offset: 0 }, { opacity: 1, offset: .75 }, { opacity: 0, offset: 1 },
    ] : [
      { opacity: preferences.staticLevel / 100, backgroundPosition: '0px 0px' },
      { opacity: 0, backgroundPosition: '13px 7px' },
    ], { duration: preferences.staticDuration, iterations: 1, easing: 'ease-out' }) || null;
    timer = startTimer(stopPulse, preferences.staticDuration);
    return true;
  }
  listen(previewButton, 'click', pulse);
  const mediaChanged = () => { stopPulse(); reflect(); };
  const media = [reducedMotion, forcedColors].filter(Boolean);
  for (const query of media) query.addEventListener?.('change', mediaChanged);
  reflect();
  return { pulse, channelChange: () => pulse({ transition: true }),
    dispose() {
      if (disposed) return;
      disposed = true; stopPulse(); body.classList.toggle('crt-mode', false);
      cabinet?.removeAttribute('data-theme');
      for (const [element, event, callback] of listeners) element.removeEventListener(event, callback);
      for (const query of media) query.removeEventListener?.('change', mediaChanged);
      overlay.remove();
    },
  };
}
