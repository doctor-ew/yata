import test from 'node:test';
import assert from 'node:assert/strict';
import { mountWindowMode } from '../src/window-mode.mjs';

test('window mode preserves player placement, restores inert/focus/scroll state and exits on Escape', () => {
 const documentRef = new EventTarget(); let restoredScroll; documentRef.defaultView = { scrollX: 0, scrollY: 480, scrollTo: (x, y) => { restoredScroll = [x, y]; } }; documentRef.documentElement = { style: { overflow: 'auto' } };
 class Element extends EventTarget {
  children = []; parentElement = null; inert = false; hidden = false; isConnected = true; attributes = new Map();
  append(child) { this.children.push(child); child.parentElement = this; }
  getAttribute(name) { return this.attributes.get(name) ?? null; } setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); }
  focus() { documentRef.activeElement = this; } getClientRects() { return this.hidden ? [] : [{}]; }
 }
 const body = new Element(), header = new Element(), main = new Element(), footer = new Element(), screen = new Element(), guide = new Element(), player = new Element(), toggle = new Element(), closeButton = new Element();
 documentRef.body = body; const classes = new Set(); body.classList = { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) };
 body.append(header); body.append(main); body.append(footer); main.append(screen); main.append(guide); screen.append(closeButton); screen.append(player); screen.append(toggle);
 screen.querySelectorAll = () => [closeButton, toggle]; footer.inert = true; closeButton.hidden = true; documentRef.activeElement = toggle;
 const controls = mountWindowMode({ documentRef, screen, toggle, closeButton });
 controls.enter();
 assert.equal(controls.isOpen(), true); assert(classes.has('window-mode')); assert.equal(header.inert, true); assert.equal(guide.inert, true);
 assert.equal(screen.inert, false); assert.equal(player.parentElement, screen); assert.equal(screen.parentElement, main);
 assert.equal(screen.getAttribute('aria-modal'), 'true'); assert.equal(documentRef.activeElement, closeButton); assert.equal(documentRef.documentElement.style.overflow, 'hidden');
 const escape = new Event('keydown', { cancelable: true }); Object.defineProperty(escape, 'key', { value: 'Escape' }); documentRef.dispatchEvent(escape);
 assert.equal(controls.isOpen(), false); assert.equal(header.inert, false); assert.equal(guide.inert, false); assert.equal(footer.inert, true);
 assert.equal(screen.getAttribute('role'), null); assert.equal(documentRef.activeElement, toggle); assert.equal(documentRef.documentElement.style.overflow, 'auto');
 assert.equal(player.parentElement, screen); assert.equal(closeButton.hidden, true); assert.deepEqual(restoredScroll, [0, 480]);
 controls.enter(); controls.dispose(); assert.equal(controls.isOpen(), false); toggle.dispatchEvent(new Event('click')); assert.equal(controls.isOpen(), false);
});
