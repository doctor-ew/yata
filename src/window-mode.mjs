// Change presentation in place: reparenting an iframe can restart its provider player.
export function mountWindowMode({ documentRef, screen, toggle, closeButton, fullScreenButton, controlsToggle, transport, getPlaybackState = () => null, isWatching = () => true }) {
  let open = false, lastFocus = null, overflow = '', savedAttributes, scroll = { x: 0, y: 0 };
  const inertStates = new Map();
  let automatic = false, suppressRotation = false, ownedFullscreen = false, nativeVideo = null;
  const view = documentRef.defaultView;
  let lastLandscape = !!view?.matchMedia?.('(orientation: landscape)').matches;
  let controlsExpanded = false;
  const originalTransportHidden = transport?.hidden ?? false;
  function showControls(expanded) {
    controlsExpanded = expanded;
    if (transport) transport.hidden = open ? !expanded : originalTransportHidden;
    if (controlsToggle) {
      controlsToggle.hidden = !open;
      controlsToggle.textContent = expanded ? '⌄' : '⌃';
      controlsToggle.setAttribute('aria-expanded', String(expanded));
      controlsToggle.setAttribute('aria-label', expanded ? 'Hide playback controls' : 'Show playback controls');
    }
  }
  const toggleControls = () => { if (open) showControls(!controlsExpanded); };
  controlsToggle?.addEventListener('click', toggleControls);
  const attributes = ['role', 'aria-modal', 'aria-label', 'tabindex'];
  function setOpen(value) {
    if (open === value) return;
    open = value;
    showControls(false);
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
    fullScreenButton?.setAttribute('aria-pressed', String(open));
    documentRef.dispatchEvent(new CustomEvent('yata:window-mode', {detail: {open}}));
    if (open) closeButton.focus({ preventScroll: true });
    else {
      documentRef.defaultView?.scrollTo(scroll.x, scroll.y);
      if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    }
  }
  const close = () => {
    suppressRotation = !!view?.matchMedia?.('(orientation: landscape)').matches; automatic = false;
    setOpen(false);
    if (documentRef.fullscreenElement === screen) { ownedFullscreen = false; void documentRef.exitFullscreen?.().catch(() => {}); }
    if (nativeVideo?.webkitDisplayingFullscreen) nativeVideo.webkitExitFullscreen?.();
  };
  function enter(explicit = false) {
    automatic = !explicit;
    setOpen(true);
    if (!explicit) return;
    // Browser fullscreen needs the user's gesture. Keep the same player node and seek position.
    if (screen.requestFullscreen) {
      try { Promise.resolve(screen.requestFullscreen({navigationUI: 'hide'})).then(() => {
        if (!open && documentRef.fullscreenElement === screen) void documentRef.exitFullscreen?.().catch(() => {});
      }).catch(() => {}); } catch { /* Window-filling fallback remains usable. */ }
    } else {
      nativeVideo = screen.querySelector?.('video');
      if (nativeVideo?.webkitEnterFullscreen) {
        try { nativeVideo.addEventListener('webkitendfullscreen', close, {once: true}); nativeVideo.webkitEnterFullscreen(); }
        catch { /* iOS may require a ready media element; preserve the viewport fallback. */ }
      }
    }
  }
  const toggleMode = () => open ? close() : enter(true);
  const fullscreenChanged = () => {
    if (documentRef.fullscreenElement === screen) ownedFullscreen = true;
    else if (ownedFullscreen) { ownedFullscreen = false; close(); }
  };
  const refreshRotation = () => {
    if (!view?.matchMedia) return;
    const landscape = view.matchMedia('(orientation: landscape)').matches;
    if (landscape !== lastLandscape) { suppressRotation = false; lastLandscape = landscape; }
    if (!landscape) { suppressRotation = false; if (automatic) close(); return; }
    const phone = view.matchMedia('(pointer: coarse)').matches && Math.min(view.innerWidth, view.innerHeight) <= 600;
    const state = getPlaybackState();
    if (!open && !suppressRotation && phone && isWatching() && state?.ready && !state.paused && !documentRef.hidden) enter(false);
  };
  const routeChanged = () => { if (open && !isWatching()) close(); };

  const keyboard = event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...screen.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], video[controls], iframe')].filter(node => !node.hidden && node.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && documentRef.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && documentRef.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  fullScreenButton?.addEventListener('click', toggleMode);
  documentRef.addEventListener('fullscreenchange', fullscreenChanged);
  documentRef.addEventListener('yata:exit-fullscreen', close);
  documentRef.addEventListener('playing', refreshRotation, true);
  documentRef.addEventListener('yata:playback-state', refreshRotation);
  view?.addEventListener?.('resize', refreshRotation);
  view?.addEventListener?.('orientationchange', refreshRotation);
  view?.addEventListener?.('hashchange', routeChanged);
  toggle.addEventListener('click', toggleMode); closeButton.addEventListener('click', close); documentRef.addEventListener('keydown', keyboard);
  return { enter: () => enter(true), exit: close, isOpen: () => open,
    dispose() { close(); controlsToggle?.removeEventListener('click', toggleControls); fullScreenButton?.removeEventListener('click', toggleMode); documentRef.removeEventListener('fullscreenchange', fullscreenChanged); documentRef.removeEventListener('yata:exit-fullscreen', close); documentRef.removeEventListener('playing', refreshRotation, true); documentRef.removeEventListener('yata:playback-state', refreshRotation); view?.removeEventListener?.('resize', refreshRotation); view?.removeEventListener?.('orientationchange', refreshRotation); view?.removeEventListener?.('hashchange', routeChanged); toggle.removeEventListener('click', toggleMode); closeButton.removeEventListener('click', close); documentRef.removeEventListener('keydown', keyboard); } };
}
