import{mountBuddy}from'/tv/src/buddy-ui.mjs';
import{launchArcadeGame}from'./arcade.mjs';
const buddy=mountBuddy({context:'arcade',onGame:async id=>{document.querySelector('#buddy-panel')?.close();if(!await launchArcadeGame(id))throw Error('This game could not be opened. Try its machine again.');return{locked:false};}});
const help=document.createElement('button');help.type='button';help.textContent='BUDDY';help.onclick=()=>buddy.open();document.querySelector('#game-dialog .game-top>div:last-child').prepend(help);
