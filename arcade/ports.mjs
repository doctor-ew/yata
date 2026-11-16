const frame=id=>`assets/ports-v12/${id}/index.html`,art=id=>`assets/port-icons/${id}.png`;
export const flashUpgrades=new Map([
 ['Tofu Hunter','tofu-hunter'],['Pizza City','pizza-city'],['Amateur Surgeon','amateur-surgeon'],['Radioactive Teddy Bear Zombies','teddy-zombies'],['Rick and Morty: Rushed Licensed Adventure','rick-and-morty'],['Aqua Teen Hunger Force: Dead Evil','dead-evil'],
]);
export function upgradeGame(game){
 const id=flashUpgrades.get(game.title);
 if(id)return {...game,frame:frame(id),originalFrame:game.frame||`flash.html?game=${encodeURIComponent(game.id)}`,phone:null,portIcon:art(id),tag:id==='rick-and-morty'?'TOUCH CONTROLS · FOUR CHAPTERS':'TOUCH CONTROLS · OPTIONAL MODS',review:id==='rick-and-morty'?'All four chapters bundled · updated touch controls':'Updated preservation build · optional mods start off',hint:id==='rick-and-morty'?'All four chapters are available from the original title screen. Use the movement pad and tap objects.':'Updated touch and keyboard controls. Use PAUSE / MODS for this game’s supported options.'};
 if(game.id==='star-wars-arcade'){const {core,file,...rest}=game;return {...rest,frame:frame('starwars'),portIcon:art('starwars'),tag:'ATARI · VECTOR ARCADE · MODS',review:'Updated flight controls · shields and Force switches',hint:'Use the in-game movement pad and Fire. PAUSE / MODS includes Reverse up/down and optional cheats.'};}
 if(game.id==='spy-hunter')return {...game,title:'Spy Hunter (Atari 2600)'};
 return game;
}
export const additionalPorts=[
 ['spy-hunter-arcade','Spy Hunter (Arcade)','spyhunter','Original arcade build · Gas, Gear, two-token credit and direct cheat switches.'],
 ['after-burner-arcade','After Burner (Arcade)','afterburner','Original Japan arcade game · flight inversion, throttle and optional cheats.'],
 ['double-dragon-arcade','Double Dragon (Arcade)','doubledragon','Original World arcade game · corrected Punch / Kick / Jump and optional cheats.'],
 ['knight-rider-nes','Knight Rider (NES)','knightrider','Original USA NES game · separate shield, fuel, timer, ammunition and lives options.'],
 ['nine-billion-miles','Nine Billion Miles from Earth','nine-billion-miles','Preserved Flash game · touch controls and optional assistance settings.'],
].map(([id,title,port,description])=>({id,title,category:port==='nine-billion-miles'?'flash':'console',status:'installed',frame:frame(port),cover:art(port==='nine-billion-miles'?'nine-billion':port),tag:'UPDATED PRESERVATION BUILD',theme:'archive-machine',description,review:'Short control checks · full playthrough not verified',hint:'Use the game’s own controls and Pause / Mods panel. Optional cheats begin off.'}));
