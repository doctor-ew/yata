import test from 'node:test';
import assert from 'node:assert/strict';
import { mountRetroEffects, RETRO_EFFECTS_STORAGE_KEY } from '../src/retro-effects.mjs';

function fixture(saved = null, { brokenStorage = false, reduced = false, forced = false } = {}) {
  const timers = new Map(), writes = [], animations = []; let timerId = 0;
  class Element extends EventTarget {
    children = []; checked = false; hidden = false; attributes = new Map(); parentElement = null;
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
  const [body, shell, screenToggle, staticToggle, player] = Array.from({length: 5}, () => Object.assign(new Element(), {ownerDocument: documentRef}));
  body.append(shell); shell.append(player);
  const storage = {
    getItem(key) { assert.equal(key, RETRO_EFFECTS_STORAGE_KEY); if (brokenStorage) throw Error('blocked'); return saved; },
    setItem(key, value) { if (brokenStorage) throw Error('full'); writes.push([key, JSON.parse(value)]); },
  };
  const controls = mountRetroEffects({body, shell, screenToggle, staticToggle, storage});
  const change = (input, checked) => { input.checked = checked; input.dispatchEvent(new Event('change')); };
  return {body, shell, player, screenToggle, staticToggle, timers, writes, animations, controls, change, reducedQuery, forcedQuery};
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
  assert.deepEqual(f.writes.at(-1), [RETRO_EFFECTS_STORAGE_KEY, {crt:false, static:true}]);
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
