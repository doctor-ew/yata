import {playbackContext} from './buddy-context.mjs';
// Original character-inspired asides; these do not describe episode events.
export const BUDDY_QUIPS=Object.freeze({
 punky:["Mismatched socks, excellent company. I think we’re ready.","If the plan needs more color, I’ve got about six ideas."],
 clarissa:["I’ve considered the options. The couch has a surprisingly strong argument.","An entire evening without Ferguson touching the remote. A promising concept."],
 vicki:["Comfort detected. Further instructions may be postponed.","Humans call this doing nothing. They appear to enjoy it very much."],
 maude:["I have a very reasonable suggestion. Naturally, I expect everyone to agree.","A quiet evening at home. Walter, try not to make it a committee meeting."],
 dorothy:["A quiet evening. I realize that’s an ambitious request in this house.","The remote has fewer complications than my love life. Let’s appreciate that."],
 rose:["Back in St. Olaf, the remote had a very important job. Mostly keeping the table level.","I brought a little cheesecake. Well, enough for a fairly determined evening."],
 blanche:["Darling, this is a private screening. I’ve decided to dress for the occasion anyway.","The lighting is flattering, the company is charming, and I haven’t even checked the schedule."],
 sophia:["Picture it: this living room, tonight. Somebody finally finds the remote.","I saved you a seat. The cheesecake has fewer guarantees."],
 firefly:["A little courage and good friends. That’s a pretty wonderful place to start.","Even a pegasus can appreciate a soft landing on the sofa."],
 stubing:['A little shore leave for the remote. An excellent decision.','The evening’s entertainment is underway. Nobody has reported a missing buffet yet.'],
 arnold:['You brought the good snacks, right? I’m not falling for celery again.','A whole station and grown-ups still ask what’s on.'],
 jabberjaw:['I can keep time AND keep you company! Nobody appreciates a versatile shark.','If the neighbors complain, tell them it’s a very small drum solo.'],
 benson:['The schedule is organized. The people remain a work in progress.','I suggest getting comfortable. It’s the one sensible item on the agenda.'],
 mrt:['Get comfortable. Even a tough day needs a commercial break.','You handle the remote. I’ll handle the encouragement.'],
 murdock:['We have reached cruising altitude. Please keep your snacks upright.','My imaginary co-pilot says the sofa has excellent landing gear.'],
 twiki:['Bidi-bidi. Snack inventory: suspiciously low.','Bidi-bidi. I’ve assigned indecision its own channel.'],
 starbuck:['I’d wager the sofa beats another patrol.','Good company, decent odds, and no briefing. I’ll take it.'],
 horshack:['Ooh! I know what we should do! Get comfortable first!','I brought enthusiasm. Was somebody supposed to bring snacks?'],
 fonz:['Easy. The remote works better when you’re cool about it.','Good company. Good seat. We’re halfway to a perfect evening.'],
 revjim:['I took a shortcut to the sofa. Somehow I went through Tuesday.','I think this is my favorite channel. Unless that’s the volume.'],
 mrsgarrett:['You can solve the rest of the world’s problems after a little rest, honey.','There’s always room for one more on the sofa. Mind the cushions.'],
 mrmagoo:['Excellent seats! And the orchestra has thoughtfully stayed inside the cabinet.','I brought my opera glasses. For the television? How delightfully extravagant.'],
 kitt:['I can calculate the optimal route. Choosing a snack remains your responsibility.','The sofa is stationary. An unusually sensible form of transportation.'],
 docbrown:['We’ve reached the past without parking a car in the living room!','The temporal calculations are complete. The popcorn calculations need work.'],
 statlerwaldorf:['‘A front-row seat!’ ‘We should have asked for an exit-row seat.’','‘I like this remote.’ ‘Good. Something here should have a following.’'],
 qbert:['@!#?@! A very elegant way of saying: nice choice of seat.','Hop to the good part of the evening. The relaxing part.'],
 skeletor:['My brilliant scheme is complete: a comfortable chair, entirely for me!','Behold my greatest conquest: control of the remote! Temporarily.'],
 scooter:['Signal checked. Backup signal checked. I might check it once more.','I’m small, but I have a very large list of things worth checking.'],
 robin:['Holy comfortable cushions! A promising start to the investigation.','A clear signal, a good seat, and teamwork. We’re on the case.'],
 mastershake:['I have personally improved this evening by being available to supervise it.','The chair and I have reached an understanding. Neither of us is moving.'],
 orko:['I tried a popcorn spell. The bowl is wearing a tiny hat now.','My next trick is finding the remote. No promises about the rabbit.'],
 penny:['The listings are ready. No exploding gadgets required.','Sometimes the most useful clue is the button labeled Guide.'],
 gadget:['Go-Go-Gadget comfy chair! Oh. That one was already working.','I’m on the case! Penny, which button was the case again?'],
 velma:['The evidence suggests a quiet evening. I’m prepared to test that theory.','A mystery with no missing remote. Finally, a manageable case.'],
 strawberry:['A cozy seat and good company. A berry promising evening.','There’s plenty of room for a little sweetness between adventures.'],
 jem:['A little backstage quiet can be truly outrageous, too.','The spotlight can wait. This seat looks pretty wonderful.'],
 shera:['Even heroes need a quiet evening with their friends.','You don’t have to conquer the whole day. A little rest counts, too.'],
 kermit:['Everybody’s ready. Which is usually when the unexpected part starts.','We’ve got a chair, a television, and remarkably little backstage damage.'],
 mspiggy:['Moi calls this a private screening. The cushions call it Tuesday.','Excellent taste in companions, darling. We’re off to a dazzling start.'],
 gonzo:['I considered watching upside down. The popcorn lodged an objection.','A sofa is just a very cautious launch platform.'],
 c3po:['A quiet evening. I do hope saying that hasn’t tempted fate.','I am fluent in many forms of communication. Remote-control shorthand remains troubling.'],
 kojak:['A comfortable seat and a little good judgment. That’s a solid lead.','Take your time. The remote isn’t going anywhere, sweetheart.'],
 captainkangaroo:['Come on in. A small surprise can make an ordinary day rather special.','A story, a comfortable chair, and a little curiosity. That’s a lovely start.'],
 pacman:['Waka waka! I’m calling the snack route a practice maze.','Take the corners carefully. Especially the corner of the snack table.'],
 donkeykong:['Barrels of fun. Very carefully stacked barrels, naturally.','A good grip and a little patience. Even the big ape needs both.'],
 frogger:['No need to rush. There’s always another good gap.','A quiet moment on solid ground. Highly underrated.'],
 mario:['One small jump at a time. We’ll get there!','A little practice, a little courage, and a comfortable seat.'],
 sonic:['Take your time picking. I’ll save the speed for later.','Fast feet, relaxed evening. That’s the balance.'],
});
export function buddyHoverMessages(persona,context) {
 const current=playbackContext(context),clean=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,240):'';
 const messages=[clean(persona?.greeting),...(persona?.quips?.length?persona.quips:BUDDY_QUIPS[persona?.id]||['A good seat and a little company. We’re ready.','The remote is yours. I’m here when you need a hand.'])];
 if(current.showTitle)messages.push(`On your screen: ${current.showTitle}${current.episodeTitle?' · '+current.episodeTitle:''}.`);
 if(current.nextShowTitle)messages.push(`In the lineup next: ${current.nextShowTitle}${current.nextEpisodeTitle?' · '+current.nextEpisodeTitle:''}.`);
 return [...new Set(messages.map(clean).filter(Boolean))];
}
export function createBuddyHoverRotation({random=Math.random}={}) {
 const previous=new Map();
 return {next({persona,context,previousText=''}={}) {
  const id=persona?.id||'unknown',messages=buddyHoverMessages(persona,context),last=previous.get(id);
  let choices=messages.filter(text=>text!==last&&text!==previousText);if(!choices.length)choices=messages.filter(text=>text!==last);if(!choices.length)choices=messages;
  const sample=random(),index=Math.floor(Math.max(0,Math.min(.999999,Number.isFinite(sample)?sample:0))*choices.length),text=choices[index]||'';
  previous.set(id,text);return text;
 }};
}
