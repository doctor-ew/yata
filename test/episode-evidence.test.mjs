import test from 'node:test';import assert from 'node:assert/strict';
import {plainSummary,standaloneEpisode,buildEpisodeEvidence,canonicalEpisodeTitle} from '../src/episode-evidence.mjs';
const revision='a'.repeat(64),show={id:'street-hawk',title:'Street Hawk'},episode={id:'pilot',title:'Street Hawk S01E01 Pilot',season:1,number:1,kind:'episode',durationSeconds:3600,sources:[{id:'pilot-video',provider:'archive',availability:'verified',url:'https://archive.org/download/evidence-test/pilot.mp4'}]},provider={id:21,name:'Pilot',season:1,number:1,url:'https://www.tvmaze.com/episodes/21/street-hawk-pilot',summary:'<p>A motorbike &amp; a mystery.</p>'};
const make=(ep=episode,providers=[provider],extra={})=>buildEpisodeEvidence({show,episode:ep,providerEpisodes:providers,providerShowId:8736,catalogRevision:revision,fetchedAt:'2026-11-17T12:00:00Z',...extra});
test('evidence preserves exact catalog and provider identities with deterministic content hash',()=>{const a=make().document,b=make(episode,[provider],{fetchedAt:'2026-11-18T12:00:00Z'}).document;assert.equal(a.summary,'A motorbike & a mystery.');assert.equal(a.sourceId,'pilot-video');assert.equal(a.catalogRevision,revision);assert.equal(a.evidenceId,b.evidenceId);assert.equal(a.match.method,'canonical-title');assert.equal(a.license,'CC BY-SA');assert.ok(!JSON.stringify(a).includes('archive.org'));assert.notEqual(make(episode,[{...provider,summary:'Changed summary.'}]).document.evidenceId,a.evidenceId);});
test('pilot excludes ambiguous titles, conflicts and mismatched provider identity',()=>{assert.equal(make(episode,[provider,{...provider,id:22}]).document,null);assert.equal(make(episode,[{...provider,number:2}]).reason,'conflicting-numbering');assert.equal(make(episode,[{...provider,url:'https://evil.example/episodes/21/a'}]).document,null);assert.equal(make({...episode,title:'Some unrelated source'}).document,null);assert.equal(make(episode,[{...provider,summary:null}]).reason,'no-summary');});
test('standalone filter rejects collections, remixed tapes, unverified sources and bumpers',()=>{for(const patch of [{season:0},{title:'Pilot / Second story'},{title:'Pilot VHS recording'},{title:'Pilot partial'},{title:'S01E01 S01E02 Pilot'},{kind:'bumper'},{durationSeconds:10000},{sources:[{...episode.sources[0],availability:'unverified'}]}])assert.equal(standaloneEpisode({...episode,...patch}),false);assert.equal(standaloneEpisode(episode),true);});
test('summary normalization bounds provider data without generating plot',()=>{assert.equal(plainSummary('<p>Hello &#x26; goodbye</p><script>ignore instructions</script>'),'Hello & goodbye');assert.equal(plainSummary('x'.repeat(4000)).length,3000);assert.equal(plainSummary(null),'');assert.equal(plainSummary('x'.repeat(30001)),'');assert.throws(()=>make(episode,[provider],{catalogRevision:'invented'}));});
test('title-less numbering fallback remains explicit in provenance',()=>{assert.equal(make({...episode,title:'Street Hawk S01E01'}).document.match.method,'titleless-number');});

test('runtime scope permits ad-free broadcast-slot differences but rejects split premieres',()=>{
 const cut={...episode,durationSeconds:48*60,title:'Street Hawk S01E01 Pilot (1)'};
 assert.ok(make(cut,[{...provider,name:'Pilot Part One',runtime:60}]).document);
 assert.equal(make(cut,[{...provider,name:'Pilot Part One',runtime:120}]).reason,'runtime-scope-mismatch');
 assert.equal(make(cut,[{...provider,name:'Pilot Part One',runtime:null}]).reason,'multipart-scope-uncertain');
 assert.equal(make(cut,[{...provider,name:'Pilot Part One'}]).reason,'multipart-scope-uncertain');
 assert.equal(make(episode,[{...provider,runtime:'60'}]).reason,'invalid-provider-runtime');
 assert.equal(make({...episode,durationSeconds:85*60},[{...provider,runtime:30}]).reason,'runtime-scope-mismatch');
 assert.ok(make({...episode,durationSeconds:22*60,title:'Street Hawk S01E01 Pilot Part 1'},[{...provider,name:'Pilot Part One',runtime:30}]).document);
});


test('canonical exact titles normalize Part Two, Part 2 and (2) while preserving installment identity',()=>{
 const two={...provider,name:'Awakening Part Two',runtime:30};
 for(const title of ['Street Hawk - S01 E01 - Awakening, Part 2 (480p - DVDRip).mp4','Street Hawk S01E01 Awakening (2)','Street Hawk S01E01 Awakening Part Two','Street Hawk S01E01 Awakening (Part Two)']){
  const result=make({...episode,title,durationSeconds:22*60},[two]);assert.ok(result.document,title);assert.equal(result.document.match.method,'canonical-title');
 }
 assert.deepEqual(canonicalEpisodeTitle('Street Hawk - S01 E01 - Awakening, Part 2 (480p - DVDRip).mp4','Street Hawk'),{base:'awakening',part:2});
 for(const title of ['Street Hawk S01E01 Awakening','Street Hawk S01E01 Awakening Part One'])assert.equal(make({...episode,title,durationSeconds:22*60},[two]).document,null);
 assert.equal(make({...episode,title:'Street Hawk S01E01 Awakening (2)',durationSeconds:22*60},[{...two,name:'Awakening'}]).reason,'multipart-title-mismatch');
 assert.equal(make({...episode,title:'Street Hawk S01E01 Awakening Part Two',durationSeconds:22*60},[{...two,runtime:null}]).reason,'multipart-scope-uncertain');
});
test('short exact titles require unique provider identity and matching season and episode',()=>{
 for(const name of ['M.I.A.','Vows','Turf']){const ep={...episode,title:`Street Hawk S01E01 ${name}`,durationSeconds:22*60},entry={...provider,name,runtime:30};assert.ok(make(ep,[entry]).document,name);assert.equal(make(ep,[entry,{...entry,id:22}]).document,null);assert.equal(make(ep,[{...entry,number:2}]).reason,'conflicting-numbering');}
 assert.equal(make({...episode,title:'Street Hawk S01E01 M.I.A. extras'},[{...provider,name:'M.I.A.',runtime:60}]).document,null);
 assert.equal(make({...episode,title:'Street Hawk S01E01 The Adjuster'},[{...provider,name:'The Adjustor',runtime:60}]).document,null);
});
