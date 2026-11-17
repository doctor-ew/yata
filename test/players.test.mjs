import test from 'node:test';
import assert from 'node:assert/strict';
import { createVideoSession, createYouTubeSession } from '../src/players.mjs';

class FakeVideo extends EventTarget {
  duration = 100; currentTime = 0; paused = true;
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  load() {}
  removeAttribute() {}
}
test('native player seeks after metadata, verifies duration, and advances at most once', async () => {
  const v = new FakeVideo(); let ends = 0, duration;
  const session = createVideoSession(v, { url: 'https://archive.org/download/sample/a.mp4', offset: 30,
    onEnd: () => ends++, onVerified: d => duration = d, onError: assert.fail });
  v.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(v.currentTime, 30); assert.equal(duration, 100);
  v.dispatchEvent(new Event('ended')); v.dispatchEvent(new Event('ended'));
  assert.equal(ends, 1);
  session.dispose(); v.dispatchEvent(new Event('ended'));
  assert.equal(ends, 1); assert(v.paused);
});
test('native player reports autoplay denial and media failure without retry loops', async () => {
  const v = new FakeVideo(); let errors = 0;
  v.play = () => Promise.reject(Error('blocked'));
  const s = createVideoSession(v, { url: 'https://archive.org/download/sample/a.mp4', onError: () => errors++ });
  await s.play(); assert.equal(errors, 1);
  v.dispatchEvent(new Event('error')); assert.equal(errors, 2);
  s.dispose(); v.dispatchEvent(new Event('error')); assert.equal(errors, 2);
});
test('disposed YouTube session never creates a late player', async () => {
  let resolve, created = 0;
  const loader = () => new Promise(r => resolve = r);
  const s = createYouTubeSession({}, { source: { url: 'https://www.youtube.com/watch?v=RmycafPZFl8' }, apiLoader: loader });
  s.dispose(); resolve({ Player: class { constructor() { created++; } } });
  await s.ready; assert.equal(created, 0);
});
test('official-player adapter handles playlist config, actual playing, ended and embed errors', async () => {
  let options, ends = 0, error, duration, state;
  class Player {
    constructor(host, opts) { options = opts; }
    destroy() {} playVideo() {} getDuration() { return 90; }
  }
  const s = createYouTubeSession({}, { source: { url: 'https://www.youtube.com/playlist?list=PL1234567890' },
    origin: 'http://localhost:4173', apiLoader: async () => ({ Player }),
    onEnd: () => ends++, onError: e => error = e, onVerified: d => duration = d, onState: s => state = s });
  await s.ready;
  assert.equal(options.playerVars.listType, 'playlist');
  options.events.onStateChange({ data: 1, target: { getDuration: () => 90 } });
  assert.equal(duration, 90);
  options.events.onStateChange({ data: 2 }); assert.equal(state, 2);
  options.events.onStateChange({ data: 0 }); options.events.onStateChange({ data: 0 });
  assert.equal(ends, 0);
  options.events.onError({ data: 150 }); assert.match(error, /embedding/);
  s.dispose(); error = null; options.events.onError({ data: 100 }); assert.equal(error, null);
});

test('YouTube video advancement happens once and loader failures are actionable', async () => {
  let events, ends = 0, error;
  const source = { url: 'https://www.youtube.com/watch?v=RmycafPZFl8' };
  const s = createYouTubeSession({}, { source, apiLoader: async () => ({ Player: class {
    constructor(host, options) { events = options.events; }
    destroy() {}
  } }), onEnd: () => ends++ });
  await s.ready;
  events.onStateChange({ data: 0 }); events.onStateChange({ data: 0 });
  assert.equal(ends, 1);
  s.dispose();
  const failed = createYouTubeSession({}, { source, apiLoader: async () => { throw Error('offline'); }, onError: e => error = e });
  await failed.ready; assert.equal(error, 'offline');
});
test('repeated metadata after an iOS interruption never rewinds to the original offset',async()=>{const v=new FakeVideo(),s=createVideoSession(v,{url:'https://archive.org/download/sample/a.mp4',offset:10});v.dispatchEvent(new Event('loadedmetadata'));v.currentTime=67;s.pause();v.dispatchEvent(new Event('loadedmetadata'));assert.equal(v.currentTime,67);await s.play();assert.equal(v.currentTime,67);s.dispose();});
