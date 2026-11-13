import test from 'node:test';
import assert from 'node:assert/strict';
import { createEpisodeLink, parseEpisodeLink, findSharedEpisode } from '../src/share.mjs';
const video='https://www.youtube.com/watch?v=RmycafPZFl8';
const base={baseUrl:'https://doctorew.com/tv/?view=station#old-anchor',showId:'gi-joe',sourceUrl:video};
test('episode links round-trip through fragment with canonical video and integer timestamp',()=>{
  const link=createEpisodeLink({...base,sourceUrl:'https://youtu.be/RmycafPZFl8?t=99',seconds:35.8});
  const url=new URL(link);assert.equal(url.pathname,'/tv/');assert.equal(url.search,'?view=station');
  assert.deepEqual(parseEpisodeLink(link),{showId:'gi-joe',sourceUrl:video,seconds:35});
  assert.equal(parseEpisodeLink(createEpisodeLink(base)).seconds,0);
  assert.equal(parseEpisodeLink(createEpisodeLink({...base,seconds:86400})).seconds,86400);
});
test('Archive filenames, playlists and external Tubi links retain supported canonical sources',()=>{
  const urls=['https://archive.org/download/example/Episode%201.mp4','https://www.youtube.com/playlist?list=PLabcdefghijk','https://tubitv.com/series/300013655/stingray'];
  for(const sourceUrl of urls)assert.equal(parseEpisodeLink(createEpisodeLink({...base,sourceUrl})).sourceUrl,sourceUrl);
  assert.throws(()=>createEpisodeLink({...base,sourceUrl:'https://archive.org/details/example'}));
});
test('unrelated anchors, invalid IDs, duplicate params and malformed timestamps return null',()=>{
  const hashes=['old-anchor','show=gi-joe','source=x','show=bad%20id&source='+encodeURIComponent(video),'show=gi-joe&source='+encodeURIComponent(video)+'&t=-1','show=gi-joe&source='+encodeURIComponent(video)+'&t=Infinity','show=gi-joe&source='+encodeURIComponent(video)+'&t=86401','show=gi-joe&source='+encodeURIComponent(video)+'&t=','show=gi-joe&show=other&source='+encodeURIComponent(video),'show=gi-joe&source='+encodeURIComponent(video)+'&redirect=https://evil.example','show=%ZZ&source=x','show=gi-joe&source=x'.repeat(400)];
  for(const hash of hashes)assert.equal(parseEpisodeLink('https://doctorew.com/tv/#'+hash),null,hash.slice(0,100));
  for(const seconds of [-1,86401,NaN,Infinity,'35'])assert.throws(()=>createEpisodeLink({...base,seconds}));
});
test('unsupported protocols, credentials, source hosts and script payloads are rejected',()=>{
  for(const sourceUrl of ['javascript:alert(1)','https://evil.example/movie.mp4','https://youtube.com.evil.example/watch?v=RmycafPZFl8','https://user:pass@archive.org/download/example/a.mp4','https://archive.org/download/example/../a.mp4']){
    assert.throws(()=>createEpisodeLink({...base,sourceUrl}));
    assert.equal(parseEpisodeLink('https://doctorew.com/tv/#'+new URLSearchParams({show:'gi-joe',source:sourceUrl})),null);
  }
  assert.throws(()=>createEpisodeLink({...base,baseUrl:'javascript:alert(1)'}));
  assert.equal(parseEpisodeLink('not a URL'),null);
});
test('find uses canonical source URL and show identity rather than browser-specific episode IDs',()=>{
  const source={id:'random-local-source',url:'https://youtu.be/RmycafPZFl8'},episode={id:'different-browser-id',sources:[source]},show={id:'gi-joe',episodes:[episode]};
  const catalog={shows:[{id:'other',episodes:[{sources:[{url:video}]}]},show]};const snapshot=JSON.stringify(catalog);
  assert.deepEqual(findSharedEpisode(catalog,{showId:'gi-joe',sourceUrl:video,seconds:5}),{show,episode,source});
  assert.equal(findSharedEpisode(catalog,{showId:'missing',sourceUrl:video}),null);
  assert.equal(findSharedEpisode(catalog,{showId:'gi-joe',sourceUrl:'https://www.youtube.com/watch?v=aaaaaaaaaaa'}),null);
  assert.equal(findSharedEpisode(catalog,null),null);assert.equal(JSON.stringify(catalog),snapshot);
});
