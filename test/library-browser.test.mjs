import test from'node:test';import assert from'node:assert/strict';import{browseLibrary,showGenres}from'../src/library-browser.mjs';
const show=(id,title,channel,ready=true)=>({id,title,channel,episodes:[{id:id+'-ep',kind:'episode',durationSeconds:100,sources:[{id:id+'-source',provider:'archive',availability:ready?'verified':'unverified',url:'https://archive.org/download/library-test/'+id+'.mp4'}]}]});
const shows=[show('z','The Z Show','action'),show('a','An Alpha Show','comedy'),show('b','Beta','cartoons',false),show('u','Unknown year','action')];const meta={z:{year:1982,genres:['Crime']},a:{year:1970,genres:['Comedy']},b:{year:1992,genres:['Adventure'],type:'Animation'}};
test('library defaults to the full catalog with article-aware alphabetical titles',()=>{assert.deepEqual(browseLibrary(shows,meta).map(s=>s.id),['a','b','u','z']);assert.deepEqual(shows.map(s=>s.id),['z','a','b','u']);});
test('channel, genre, premiere decade and availability filters combine without affecting catalog content',()=>{assert.deepEqual(browseLibrary(shows,meta,{channel:'action',genre:'Crime',decade:'1980',availability:'playable'}).map(s=>s.id),['z']);assert.deepEqual(browseLibrary(shows,meta,{genre:'Animation',availability:'wishlist'}).map(s=>s.id),['b']);assert.deepEqual(browseLibrary(shows,meta,{decade:'unknown'}).map(s=>s.id),['u']);assert.deepEqual(browseLibrary(shows,meta,{query:'alpha'}).map(s=>s.id),['a']);assert.deepEqual(browseLibrary(shows,meta,{genre:'Science-Fiction'}),[]);});
test('premiere sorts keep undated titles last in either direction and break ties by title',()=>{assert.deepEqual(browseLibrary(shows,meta,{sort:'oldest'}).map(s=>s.id),['a','z','b','u']);assert.deepEqual(browseLibrary(shows,meta,{sort:'newest'}).map(s=>s.id),['b','z','a','u']);assert.deepEqual(showGenres({type:'Animation',genres:['Comedy','Comedy']}),['Comedy','Animation']);});

test('premiere sorting uses actual dates within the same year',()=>{const entries=[show('late','Alpha','action'),show('early','Zulu','action')],data={late:{year:1982,premiered:'1982-12-01'},early:{year:1982,premiered:'1982-01-01'}};assert.deepEqual(browseLibrary(entries,data,{sort:'oldest'}).map(s=>s.id),['early','late']);});

test('episode browser combines title/story and season filters without changing the show or splitting collections',async()=>{
 const {browseEpisodes}=await import('../src/library-browser.mjs');
 const show={episodes:[{id:'late',title:'S02E01 Return',season:2,number:1},{id:'collection',title:'Snow White / Briar Rose · VHS collection',season:0,number:1},{id:'early',title:'S01E02 Return to Etheria',season:1,number:2}]};
 assert.deepEqual(browseEpisodes(show,{query:'return',season:'1'}).map(e=>e.id),['early']);
 assert.deepEqual(browseEpisodes(show,{query:'briar'}).map(e=>e.id),['collection']);
 assert.deepEqual(browseEpisodes(show,{season:'0'}).map(e=>e.id),['collection']);
 assert.deepEqual(browseEpisodes(show).map(e=>e.id),['collection','early','late']);
 assert.deepEqual(browseEpisodes(show,{query:'missing'}),[]);
 assert.equal(show.episodes[0].id,'late');assert.equal(show.episodes.length,3);
});
