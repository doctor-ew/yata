// Deterministic station randomness, independent of browser refresh and wall-clock reads.
export function seededRandom(seed, scope = '') {
  let state = seed >>> 0;
  for (const char of scope) state = (Math.imul(state, 131) + char.charCodeAt(0)) >>> 0;
  if (!state) state = 0x9e3779b9;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
}
export function shuffled(items, random, avoidFirst = null) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  if (copy.length > 1 && copy[0] === avoidFirst) [copy[0], copy[1]] = [copy[1], copy[0]];
  return copy;
}
// Breaks use unique available clips; a short pool caps the requested length.
export function createCommercialBreak(bumpers, { seed = 1984, scope = '', commercialCount = 1, randomize = true } = {}) {
  const clips = [...new Map(bumpers.map(entry => [entry.episode.id, entry])).values()];
  const clipRandom = seededRandom(seed, `${scope}:bumpers`), countRandom = seededRandom(seed, `${scope}:break-count`);
  let order = randomize ? shuffled(clips, clipRandom) : clips.slice(), cursor = 0, last = null;
  return () => {
    const requested = commercialCount === 'random' ? 1 + Math.floor(countRandom() * 3) : [1, 2, 3].includes(commercialCount) ? commercialCount : 1;
    const count = Math.min(requested, clips.length), used = new Set(), result = [];
    for (let index = 0; index < count; index++) {
      const available = entry => !used.has(entry) && (clips.length < 2 || entry !== last);
      let candidate = order.findIndex((entry, index) => index >= cursor && available(entry));
      if (candidate < 0) {
        order = randomize ? shuffled(clips, clipRandom, last) : clips.slice(); cursor = 0;
        candidate = order.findIndex(available);
      }
      const entry = order[candidate];
      [order[cursor], order[candidate]] = [order[candidate], order[cursor]]; cursor++;
      result.push(entry); used.add(entry); last = entry;
    }
    return result;
  };
}
function storyBlocks(queue) {
  const blocks = [];
  for (const entry of queue) {
    const previous = blocks.at(-1);
    if (entry.episode.group && previous?.[0].episode.group === entry.episode.group) previous.push(entry);
    else blocks.push([entry]);
  }
  return blocks;
}
// Each round still gives every show one turn. Keep two other shows between
// repeat turns where the pool permits, including the schedule seam when possible.
function spacedShowOrder(states, random, recent, opening, finalRound) {
  const candidates = shuffled(states, random), distance = Math.min(2, states.length - 1);
  for (const seamDistance of finalRound ? [distance, 1] : [0]) {
    let visits = 0;
    const search = (chosen, remaining) => {
      if (++visits > 10000) return null;
      if (!remaining.length) {
        if (finalRound) {
          const seam = [...recent, ...chosen];
          for (const state of opening.slice(0, seamDistance)) {
            if (seam.slice(-seamDistance).includes(state)) return null;
            seam.push(state);
          }
        }
        return chosen;
      }
      const excluded = [...recent, ...chosen].slice(-distance);
      for (const state of remaining) {
        if (distance && excluded.includes(state)) continue;
        const result = search([...chosen, state], remaining.filter(s => s !== state));
        if (result) return result;
      }
      return null;
    };
    const result = search([], candidates);
    if (result) return result;
  }
  return shuffled(states, random, recent.at(-1));
}
export function randomRotation(queues, bumpers, { seed = 1984, scope = '', storiesPerTurn = 1, includeBumpers = false, commercialCount = 1, orderedShowIds = [] } = {}) {
  const orderedIds = new Set(orderedShowIds);
  const states = queues.filter(queue => queue.length).map(queue => {
    const blocks = storyBlocks(queue), random = seededRandom(seed, `${scope}:${queue[0].show.id}`);
    const ordered = orderedIds.has(queue[0].show.id);
    return { blocks, random, ordered, order: ordered ? blocks.slice() : shuffled(blocks, random), cursor: 0, last: null };
  });
  if (!states.length) return [];
  const count = [1, 2, 3].includes(storiesPerTurn) ? storiesPerTurn : 1;
  const rounds = Math.max(...states.map(state => Math.ceil(state.blocks.length / Math.min(count, state.blocks.length))));
  const showRandom = seededRandom(seed, `${scope}:show-order`);
  const nextBreak = createCommercialBreak(bumpers, { seed, scope, commercialCount });
  const recent = [], opening = [];
  const result = [];
  for (let round = 0; round < rounds; round++) {
    const order = spacedShowOrder(states, showRandom, recent, opening, round === rounds - 1);
    if (!opening.length) opening.push(...order.slice(0, 2));
    for (const state of order) {
      const usedThisTurn = new Set();
      for (let i = 0; i < Math.min(count, state.blocks.length); i++) {
        if (state.cursor === state.order.length) {
          state.order = state.ordered ? state.blocks.slice() : shuffled(state.blocks, state.random, state.last);
          if (usedThisTurn.size) state.order = [...state.order.filter(block => !usedThisTurn.has(block)), ...state.order.filter(block => usedThisTurn.has(block))];
          state.cursor = 0;
        }
        const block = state.order[state.cursor++]; result.push(...block); state.last = block; usedThisTurn.add(block);
        if (includeBumpers) result.push(...nextBreak());
      }
      recent.push(state); if (recent.length > 2) recent.shift();
    }
  }
  return result;
}
