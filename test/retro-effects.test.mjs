import test from 'node:test';
import assert from 'node:assert/strict';
import { mountRetroEffects, RETRO_EFFECTS_STORAGE_KEY } from '../src/retro-effects.mjs';

function fixture(saved = null, { brokenStorage = false, reduced = false, forced = false } = {}) {
  const timers = new Map(), writes = [], animations = []; let timerId = 0;
  class Element extends EventTarget {
    children = []; checked = false; hidden = false; attributes = new Map(); parentElement = null;
    value = ''; disabled = false; textContent = ''; style = {setProperty: (key, value) => this.attributes.set(key, value)};
    removeAttribute(name) { this.attributes.delete(name); }
    classes = new Set(); classList = {toggle: (name, value) => value ? this.classes.add(name) : this.classes.delete(name)};
    setAttribute(name, value) { this.attributes.set(name, value); }
    append(child) { this.children.push(child); child.parentElement = this; }
    remove() { this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
    animate(frames, options) { const animation = {frames, options, cancelled: false, cancel() { this.cancelled = true; }}; animations.push(animation); return animation; }
  }
  const reducedQuery = new EventTarget(), forcedQuery = new EventTarget(); reducedQuery.matches = reduced; forcedQuery.matches = forced;
  const documentRef = {createElement: () => Object.assign(new Element(), {ownerDocument: documentRef})};
  documentRef.defaultView = {
    matchMedia: query => query.includes('reduced-motion') ? reducedQuery : forcedQuery,
    setTimeout: (callback, ms) => { timers.set(++timerId, {callback, ms}); return timerId; },
    clearTimeout: id => timers.delete(id),
  };
  const [body, shell, screenToggle, staticToggle, player, cabinet, themeSelect, levelInput, durationInput, modeSelect, previewButton, levelOutput, durationOutput] = Array.from({length: 13}, () => Object.assign(new Element(), {ownerDocument: documentRef}));
  body.append(cabinet); cabinet.append(shell); shell.append(player);
  const storage = {
    getItem(key) { assert.equal(key, RETRO_EFFECTS_STORAGE_KEY); if (brokenStorage) throw Error('blocked'); return saved; },
    setItem(key, value) { if (brokenStorage) throw Error('full'); writes.push([key, JSON.parse(value)]); },
  };
  const controls = mountRetroEffects({body, shell, screenToggle, staticToggle, storage, cabinet, themeSelect, levelInput, durationInput, modeSelect, previewButton, levelOutput, durationOutput});
  const change = (input, checked) => { input.checked = checked; input.dispatchEvent(new Event('change')); };
  const input = (control, value, event = 'input') => { control.value = String(value); control.dispatchEvent(new Event(event)); };
  return {cabinet, themeSelect, levelInput, durationInput, modeSelect, previewButton, levelOutput, durationOutput, input, body, shell, player, screenToggle, staticToggle, timers, writes, animations, controls, change, reducedQuery, forcedQuery};
}

test('retro effects default off, validate saved booleans and preserve the provider node', () => {
  for (const saved of [null, '{', '[]', '{"crt":"yes","static":true}', '{"crt":true}']) {
    const f = fixture(saved); assert.equal(f.screenToggle.checked, false); assert.equal(f.staticToggle.checked, false);
    assert.equal(f.controls.pulse(), false); assert.equal(f.player.parentElement, f.shell); assert.equal(f.shell.children[0], f.player);
    const overlay = f.shell.children[1]; assert.equal(overlay.attributes.get('aria-hidden'), 'true'); assert.equal(overlay.hidden, true);
    f.controls.dispose(); assert.deepEqual(f.shell.children, [f.player]);
  }
  const f = fixture('{"crt":true,"static":true}'); assert.ok(f.body.classes.has('crt-mode')); assert.equal(f.staticToggle.checked, true);
  f.change(f.screenToggle, false); assert.equal(f.body.classes.has('crt-mode'), false);
  assert.deepEqual(f.writes.at(-1), [RETRO_EFFECTS_STORAGE_KEY, {crt:false, static:true, theme:'80s', staticLevel:12, staticDuration:180, staticMode:'tuning'}]);
  f.controls.dispose();
});

test('tuning static is short, repeat-safe and cancelled when disabled', () => {
  const f = fixture(); f.change(f.staticToggle, true); assert.equal(f.controls.pulse(), true);
  assert.equal(f.shell.children[1].hidden, false); assert.ok(f.shell.classes.has('retro-static-active'));
  assert.equal(f.timers.size, 1); assert.equal([...f.timers.values()][0].ms, 180);
  assert.equal(f.animations[0].options.duration, 180); assert.equal(f.animations[0].options.iterations, 1);
  assert.ok(f.animations[0].frames.every(frame => frame.opacity >= 0 && frame.opacity <= .16));
  f.controls.pulse(); assert.equal(f.timers.size, 1); assert.equal(f.animations[0].cancelled, true);
  const timer = [...f.timers.values()][0]; timer.callback();
  assert.equal(f.shell.children[1].hidden, true); assert.equal(f.timers.size, 0);
  f.controls.pulse(); f.change(f.staticToggle, false);
  assert.equal(f.shell.children[1].hidden, true); assert.equal(f.timers.size, 0); assert.equal(f.controls.pulse(), false);
  f.controls.dispose();
});

test('motion and forced-color preferences suppress static and stop an active pulse', () => {
  for (const option of [{reduced:true}, {forced:true}]) {
    const f = fixture('{"crt":true,"static":true}', option); assert.equal(f.controls.pulse(), false); assert.equal(f.animations.length, 0); assert.equal(f.timers.size, 0); f.controls.dispose();
  }
  const f = fixture('{"crt":false,"static":true}'); f.controls.pulse();
  f.reducedQuery.matches = true; f.reducedQuery.dispatchEvent(new Event('change'));
  assert.equal(f.shell.children[1].hidden, true); assert.equal(f.timers.size, 0);
  f.controls.dispose();
});

test('storage failures leave controls usable and disposal removes overlays, timers and listeners', () => {
  const f = fixture(null, {brokenStorage:true});
  f.change(f.screenToggle, true); assert.ok(f.body.classes.has('crt-mode'));
  f.change(f.staticToggle, true); assert.equal(f.controls.pulse(), true);
  const overlay = f.shell.children[1]; f.controls.dispose();
  assert.equal(f.timers.size, 0); assert.equal(overlay.parentElement, null); assert.equal(f.body.classes.has('crt-mode'), false);
  assert.equal(f.shell.classes.has('retro-static-active'), false); assert.equal(f.player.parentElement, f.shell);
  f.change(f.screenToggle, true); assert.equal(f.body.classes.has('crt-mode'), false); assert.equal(f.controls.pulse(), false);
  f.controls.dispose();
});

test('cabinet changes persist independently and never move the player', () => {
  const f = fixture();
  assert.equal(f.cabinet.attributes.get('data-theme'), '80s');
  for (const theme of ['none', '70s', '80s', '90s']) {
    f.input(f.themeSelect, theme, 'change');
    assert.equal(f.cabinet.attributes.get('data-theme'), theme);
    assert.equal(f.player.parentElement, f.shell); assert.equal(f.shell.parentElement, f.cabinet);
    assert.equal(f.shell.children[0], f.player);
    assert.equal(f.writes.at(-1)[1].theme, theme);
  }
  f.input(f.themeSelect, 'unrecognized', 'change'); assert.equal(f.themeSelect.value, '80s');
  f.controls.dispose(); assert.equal(f.cabinet.attributes.has('data-theme'), false);
});

test('strength and pulse duration are configurable, bounded and reflected', () => {
  const f = fixture(); assert.equal(f.previewButton.disabled, true);
  f.change(f.staticToggle, true); assert.equal(f.previewButton.disabled, false);
  f.input(f.levelInput, 99); f.input(f.durationInput, 10000); f.controls.pulse();
  assert.equal(f.levelOutput.textContent, '30%'); assert.equal(f.durationOutput.textContent, '800 ms');
  assert.equal(f.shell.children[1].attributes.get('--static-opacity'), '0.3');
  assert.equal(f.animations.at(-1).frames[0].opacity, .3); assert.equal(f.animations.at(-1).options.duration, 800);
  f.input(f.durationInput, -10); assert.equal(f.durationInput.value, '80');
  f.input(f.levelInput, 0); assert.equal(f.controls.pulse(), false); assert.equal(f.previewButton.disabled, true);
  assert.equal(f.timers.size, 0); assert.equal(f.shell.children[1].hidden, true);
  f.controls.dispose();
});

test('continuous static respects toggles, media preferences and cleanup', () => {
  const f = fixture(); f.input(f.modeSelect, 'continuous', 'change');
  assert.equal(f.shell.children[1].hidden, true);
  f.change(f.staticToggle, true); const overlay = f.shell.children[1];
  assert.equal(overlay.hidden, false); assert.ok(overlay.classes.has('retro-static-continuous')); assert.equal(f.timers.size, 0);
  f.previewButton.dispatchEvent(new Event('click')); assert.equal(f.timers.size, 1);
  [...f.timers.values()][0].callback(); assert.equal(overlay.hidden, false);
  f.forcedQuery.matches = true; f.forcedQuery.dispatchEvent(new Event('change'));
  assert.equal(overlay.hidden, true); assert.equal(f.controls.pulse(), false); assert.equal(f.previewButton.disabled, true);
  f.forcedQuery.matches = false; f.forcedQuery.dispatchEvent(new Event('change')); assert.equal(overlay.hidden, false);
  f.input(f.modeSelect, 'tuning', 'change'); assert.equal(overlay.hidden, true);
  f.controls.dispose(); const writes = f.writes.length;
  f.input(f.levelInput, 25); f.input(f.themeSelect, '70s', 'change'); f.previewButton.dispatchEvent(new Event('click'));
  assert.equal(f.writes.length, writes); assert.equal(f.timers.size, 0); assert.equal(overlay.parentElement, null);
});

test('legacy preferences migrate with defaults and malformed new settings stay bounded', () => {
  const legacy = fixture('{"crt":true,"static":true}');
  assert.equal(legacy.themeSelect.value, '80s'); assert.equal(legacy.levelInput.value, '12'); assert.equal(legacy.durationInput.value, '180'); assert.equal(legacy.modeSelect.value, 'tuning'); legacy.controls.dispose();
  const f = fixture(JSON.stringify({crt:false, static:true, theme:'invalid', staticLevel:-4, staticDuration:900, staticMode:'invalid'}));
  assert.equal(f.themeSelect.value, '80s'); assert.equal(f.levelInput.value, '0'); assert.equal(f.durationInput.value, '800'); assert.equal(f.modeSelect.value, 'tuning'); f.controls.dispose();
});

test('the original mounting API works without the optional cabinet controls', () => {
  const f = fixture(); f.controls.dispose();
  const controls = mountRetroEffects({body:f.body, shell:f.shell, screenToggle:f.screenToggle, staticToggle:f.staticToggle});
  f.change(f.staticToggle, true); assert.equal(controls.pulse(), true); assert.equal(f.player.parentElement, f.shell);
  controls.dispose(); assert.deepEqual(f.shell.children, [f.player]);
});
