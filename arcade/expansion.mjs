// Original arcade variants. Install and check against expansion-sources.json.
export const expansionGames=[
 ['rampage','Rampage'],['rmpgwt','Rampage World Tour'],['xmen','X-Men (Konami Arcade)'],
 ['sf2','Street Fighter II'],['ssf2t','Super Street Fighter II Turbo'],['sfa3','Street Fighter Alpha 3'],
 ['xmcota','X-Men: Children of the Atom'],['msh','Marvel Super Heroes'],['xmvsf','X-Men vs. Street Fighter'],
 ['mshvsf','Marvel Super Heroes vs. Street Fighter'],['mvsc','Marvel vs. Capcom: Clash of Super Heroes'],
].map(([rom,title])=>({id:'expansion-'+rom,title,category:'console',status:'installed',review:'Boot rendering checked · gameplay not verified',fighter:!['rampage','rmpgwt','xmen'].includes(rom),tag:'ORIGINAL ARCADE',theme:'cartridge',core:'mame2003_plus',filename:rom+'.zip',file:'assets/expansion/'+rom+'.zip',description:'Original arcade version · keyboard, controller and emulator touch controls.',hint:'Insert a credit, then press Start. Configure gamepad or touch controls in the emulator menu. Multiplayer support needs a separate check.'}));

expansionGames.push(...[
 {id:'expansion-cvspro',fighter:true,title:'Capcom vs. SNK Pro (PlayStation)',core:'pcsx_rearmed',filename:'cvspro.chd'},
 {id:'expansion-rampage2',title:'Rampage 2: Universal Tour (N64)',core:'mupen64plus_next',filename:'rampage2.z64'},
 {id:'expansion-sfiii3n',fighter:true,title:'Street Fighter III: 3rd Strike',core:'fbneo',filename:'sfiii3n.zip'},
].map(game=>({...game,category:'console',status:'installed',review:'Boot rendering checked · gameplay not verified',tag:'CONSOLE / ARCADE EXPANSION',theme:'cartridge',file:'assets/expansion/'+game.filename,description:'Original game · newly added emulator core.',hint:'Use the emulator control settings to map keyboard, controller or touch input. Full gameplay and multiplayer are not verified.'})));

export const unsupportedExpansionGames=[
 {id:'expansion-mvsc2',title:'Marvel vs. Capcom 2'},
 {id:'expansion-cvs2',title:'Capcom vs. SNK 2'},
].map(game=>({...game,category:'console',status:'needs-recovery',review:'Runtime unavailable',reason:'The current browser player has no Dreamcast / NAOMI core. A compatible runtime is required before this can be installed.',tag:'REQUESTED · NOT INSTALLED',theme:'cartridge',description:'Kept on the expansion list; no non-working PLAY button.'}));
