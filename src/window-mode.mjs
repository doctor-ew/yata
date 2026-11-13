// Change presentation in place: reparenting an iframe can restart its provider player.
export function mountWindowMode({ documentRef, screen, toggle, closeButton }) {
  let open = false, lastFocus = null, overflow = '', savedAttributes, scroll = { x: 0, y: 0 };
  const inertStates = new Map();
  const attributes = ['role', 'aria-modal', 'aria-label', 'tabindex'];
  function setOpen(value) {
    if (open === value) return;
    open = value;
    if (open) {
      lastFocus = documentRef.activeElement;
      scroll = { x: documentRef.defaultView?.scrollX || 0, y: documentRef.defaultView?.scrollY || 0 };
      overflow = documentRef.documentElement.style.overflow;
      savedAttributes = attributes.map(name => [name, screen.getAttribute(name)]);
      let node = screen;
      while (node.parentElement) {
        const parent = node.parentElement;
        for (const sibling of parent.children) if (sibling !== node) { inertStates.set(sibling, sibling.inert); sibling.inert = true; }
        if (parent === documentRef.body) break;
        node = parent;
      }
      documentRef.documentElement.style.overflow = 'hidden';
      screen.setAttribute('role', 'dialog'); screen.setAttribute('aria-modal', 'true');
      screen.setAttribute('aria-label', 'Window-filling video player'); screen.setAttribute('tabindex', '-1');
    } else {
      for (const [node, inert] of inertStates) node.inert = inert;
      inertStates.clear();
      documentRef.documentElement.style.overflow = overflow;
      for (const [name, value] of savedAttributes) { if (value === null) screen.removeAttribute(name); else screen.setAttribute(name, value); }
    }
    documentRef.body.classList.toggle('window-mode', open);
    closeButton.hidden = !open;
    toggle.textContent = open ? '⛶ Exit window' : '⛶ Fill window';
    toggle.setAttribute('aria-pressed', String(open));
    toggle.setAttribute('aria-label', open ? 'Exit window mode' : 'Fill browser window');
    if (open) closeButton.focus({ preventScroll: true });
    else {
      documentRef.defaultView?.scrollTo(scroll.x, scroll.y);
      if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    }
  }
  const toggleMode = () => setOpen(!open), close = () => setOpen(false);
  const keyboard = event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...screen.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], video[controls], iframe')].filter(node => !node.hidden && node.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && documentRef.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && documentRef.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  toggle.addEventListener('click', toggleMode); closeButton.addEventListener('click', close); documentRef.addEventListener('keydown', keyboard);
  return { enter: () => setOpen(true), exit: close, isOpen: () => open,
    dispose() { close(); toggle.removeEventListener('click', toggleMode); closeButton.removeEventListener('click', close); documentRef.removeEventListener('keydown', keyboard); } };
}
