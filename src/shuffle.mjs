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
function storyBlocks(queue) {
  const blocks = [];
  for (const entry of queue) {
    const previous = blocks.at(-1);
    if (entry.episode.group && previous?.[0].episode.group === entry.episode.group) previous.push(entry);
    else blocks.push([entry]);
  }
  return blocks;
}
export function randomRotation(queues, bumpers, { seed = 1984, scope = '', storiesPerTurn = 1, includeBumpers = false } = {}) {
  const states = queues.filter(queue => queue.length).map(queue => {
    const blocks = storyBlocks(queue), random = seededRandom(seed, `${scope}:${queue[0].show.id}`);
    return { blocks, random, order: shuffled(blocks, random), cursor: 0, last: null };
  });
  if (!states.length) return [];
  const count = [1, 2, 3].includes(storiesPerTurn) ? storiesPerTurn : 1;
  const rounds = Math.max(...states.map(state => Math.ceil(state.blocks.length / Math.min(count, state.blocks.length))));
  const showRandom = seededRandom(seed, `${scope}:show-order`), bumperRandom = seededRandom(seed, `${scope}:bumpers`);
  let firstShow = null, lastShow = null, bumperOrder = shuffled(bumpers, bumperRandom), bumperCursor = 0, lastBumper = null;
  const result = [];
  for (let round = 0; round < rounds; round++) {
    const order = shuffled(states, showRandom, lastShow);
    if (!firstShow) firstShow = order[0];
    if (round === rounds - 1 && order.length > 1 && order.at(-1) === firstShow) {
      const swap = order.findIndex((state, index) => index < order.length - 1 && (index !== 0 || firstShow !== lastShow));
      if (swap >= 0) [order[swap], order[order.length - 1]] = [order.at(-1), order[swap]];
    }
    for (const state of order) {
      const usedThisTurn = new Set();
      for (let i = 0; i < Math.min(count, state.blocks.length); i++) {
        if (state.cursor === state.order.length) {
          state.order = shuffled(state.blocks, state.random, state.last);
          if (usedThisTurn.size) state.order = [...state.order.filter(block => !usedThisTurn.has(block)), ...state.order.filter(block => usedThisTurn.has(block))];
          state.cursor = 0;
        }
        const block = state.order[state.cursor++]; result.push(...block); state.last = block; usedThisTurn.add(block);
        if (includeBumpers && bumpers.length) {
          if (bumperCursor === bumperOrder.length) { bumperOrder = shuffled(bumpers, bumperRandom, lastBumper); bumperCursor = 0; }
          lastBumper = bumperOrder[bumperCursor++]; result.push(lastBumper);
        }
      }
      lastShow = state;
    }
  }
  return result;
}
