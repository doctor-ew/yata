export const DIAL_FEEDBACK_STORAGE_KEY = 'yata.dial-feedback.v1';
const SOUND_SECONDS = .112;

// Original procedural sound, created only by a user's dial gesture.
export function mountDialFeedback({ windowRef, storage, toggle, getVolume = () => 1, getMuted = () => false, pulse = () => {} }) {
  let enabled = true, disposed = false, context = null, active = null, generation = 0;
  try {
    const saved = JSON.parse(storage?.getItem(DIAL_FEEDBACK_STORAGE_KEY) || 'null');
    if (typeof saved === 'boolean') enabled = saved;
    else if (saved && typeof saved.enabled === 'boolean') enabled = saved.enabled;
  } catch { /* Feedback remains optional when storage is unavailable. */ }
  if (toggle) toggle.checked = enabled;

  function cleanup(graph, stop = false) {
    if (!graph || graph.cleaned) return;
    graph.cleaned = true;
    if (active === graph) active = null;
    if (graph.source) {
      graph.source.onended = null;
      if (stop) try { graph.source.stop(); } catch { /* It may already have ended. */ }
    }
    for (const node of graph.nodes) try { node.disconnect(); } catch { /* Partial audio setup may fail. */ }
  }
  function audioVolume() {
    try {
      if (getMuted()) return 0;
      const value = getVolume();
      return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    } catch { return 0; }
  }
  const changed = () => {
    enabled = toggle.checked === true;
    if (!enabled) { generation++; cleanup(active, true); }
    try { storage?.setItem(DIAL_FEEDBACK_STORAGE_KEY, JSON.stringify({enabled})); } catch { /* UI still works. */ }
  };
  toggle?.addEventListener('change', changed);

  return {
    async play() {
      if (disposed || !enabled) return false;
      const ticket = ++generation;
      cleanup(active, true);
      try { pulse(); } catch { /* Visual feedback must not block the dial action. */ }
      if (!audioVolume()) return false;
      let graph = null;
      try {
        if (!context || context.state === 'closed') {
          if (typeof windowRef?.AudioContext !== 'function') return false;
          context = new windowRef.AudioContext();
        }
        if (context.state === 'suspended') await context.resume();
        if (disposed || !enabled || ticket !== generation || context.state !== 'running') return false;
        const volume = audioVolume(); if (!volume) return false;
        const sampleRate = context.sampleRate;
        const buffer = context.createBuffer(1, Math.ceil(sampleRate * SOUND_SECONDS), sampleRate);
        const samples = buffer.getChannelData(0);
        for (let index = 0; index < samples.length; index++) {
          const time = index / sampleRate;
          const click = time < .022 ? .65 * (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * 1450 * time)) * Math.exp(-180 * time) * Math.min(1, time / .001) : 0;
          const noiseTime = time - .012;
          const noise = noiseTime >= 0 && noiseTime < .1 ? .28 * (Math.random() * 2 - 1) * Math.min(1, noiseTime / .003) * (1 - noiseTime / .1) : 0;
          samples[index] = click + noise;
        }
        graph = {nodes: [], source: null, cleaned: false};
        const source = context.createBufferSource(); graph.nodes.push(source); graph.source = source;
        const highpass = context.createBiquadFilter(); graph.nodes.push(highpass);
        const lowpass = context.createBiquadFilter(); graph.nodes.push(lowpass);
        const gain = context.createGain(); graph.nodes.push(gain);
        source.buffer = buffer; source.loop = false;
        highpass.type = 'highpass'; highpass.frequency.value = Math.min(300, sampleRate / 4); highpass.Q.value = .7;
        lowpass.type = 'lowpass'; lowpass.frequency.value = Math.min(4500, sampleRate / 2 - 1); lowpass.Q.value = .7;
        gain.gain.value = .08 * volume;
        source.connect(highpass); highpass.connect(lowpass); lowpass.connect(gain); gain.connect(context.destination);
        source.onended = () => cleanup(graph);
        active = graph;
        source.start(context.currentTime);
        source.stop(context.currentTime + SOUND_SECONDS);
        return true;
      } catch {
        cleanup(graph, true);
        return false;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true; generation++; cleanup(active, true);
      toggle?.removeEventListener('change', changed);
      const owned = context; context = null;
      if (owned && owned.state !== 'closed') try { Promise.resolve(owned.close()).catch(() => {}); } catch { /* Already closing. */ }
    },
  };
}
