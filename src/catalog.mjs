import { COMMERCIAL_SHOW_ID } from './domain.mjs';
import { MOVIE_SHOW_ID, ADDITIONAL_SCIFI_SERIES, MOVIE_WISHLIST } from './collections.mjs';
import { migratedShowChannel } from './channels.mjs';
export { CHANNELS } from './channels.mjs';

const action = [
  ['dukes', 'The Dukes of Hazzard'], ['knight-rider', 'Knight Rider'],
  ['greatest-american-hero', 'The Greatest American Hero'], ['airwolf', 'Airwolf'],
  ['a-team', 'The A-Team'], ['fall-guy', 'The Fall Guy'], ['macgyver', 'MacGyver'],
  ['magnum', 'Magnum, P.I.'], ['chips', 'CHiPs'], ['simon', 'Simon & Simon'],
  ['riptide', 'Riptide'], ['hardcastle', 'Hardcastle and McCormick'],
  ['automan', 'Automan'], ['street-hawk', 'Street Hawk'], ['manimal', 'Manimal'],
  ['phoenix', 'The Phoenix'], ['voyagers', 'Voyagers!'],
  ['buck-rogers', 'Buck Rogers in the 25th Century'],
  ['battlestar', 'Battlestar Galactica'], ['v', 'V'], ['hulk', 'The Incredible Hulk'],
  ["wizards-warriors", "Wizards and Warriors (1983)"],
  ["matthew-star", "The Powers of Matthew Star"],
  ["misfits-science", "Misfits of Science (1985)"],
  ["otherworld", "Otherworld (1985)"],
  ["whiz-kids", "Whiz Kids"],
  ["blue-thunder", "Blue Thunder (1984)"],
  ["the-master", "The Master (1984)"],
  ["gold-monkey", "Tales of the Gold Monkey"],
  ["stingray", "Stingray (1985)"],
  ["matt-houston", "Matt Houston"],
];
const cartoons = [
  ['he-man', 'He-Man and the Masters of the Universe'], ['gi-joe', 'G.I. Joe: A Real American Hero'],
  ['transformers', 'The Transformers'], ['mighty-orbots', 'Mighty Orbots'],
  ['thundercats', 'ThunderCats'], ['voltron', 'Voltron'], ['mask', 'M.A.S.K.'],
  ['silverhawks', 'SilverHawks'], ['dungeons-dragons', 'Dungeons & Dragons'],
  ['centurions', 'The Centurions'], ['thundarr', 'Thundarr the Barbarian'],
  ['inspector-gadget', 'Inspector Gadget'],
  ['spider-friends', 'Spider-Man and His Amazing Friends'],
  ['hulk-1982', 'The Incredible Hulk (1982 animated)'],
  ["bionic-six", "Bionic Six"],
  ["jayce", "Jayce and the Wheeled Warriors"],
  ["pole-position", "Pole Position"],
  ["turbo-teen", "Turbo Teen"],
  ["bravestarr", "BraveStarr"],
  ["defenders-earth", "Defenders of the Earth"],
  ["drak-pack", "Drak Pack"],
  ["dragons-lair", "Dragon’s Lair"],
  ["galaxy-rangers", "The Adventures of the Galaxy Rangers"],
  ["visionaries", "Visionaries: Knights of the Magical Light"],
  ["space-ghost", "Space Ghost and Dino Boy"],
  ["herculoids", "The Herculoids"],
  ["galtar", "Galtar and the Golden Lance"],
  ["speed-buggy", "Speed Buggy"],
  ["captain-caveman", "Captain Caveman and the Teen Angels"],
  ["hong-kong-phooey", "Hong Kong Phooey"],
  ["dynomutt", "Dynomutt, Dog Wonder"],
  ["yogi-bear", "Yogi Bear (original shorts)"],
  ["birdman", "Birdman and the Galaxy Trio"],
  ["jonny-quest", "Jonny Quest (1964)"],
  ["super-friends", "Super Friends (1973)"],
  ["flintstones", "The Flintstones"],
  ["jetsons", "The Jetsons"],
  ["wacky-races", "Wacky Races (1968)"],
  ["butch-cassidy", "Butch Cassidy and the Sundance Kids"],
  ["clue-club", "Clue Club"],
  ["goober", "Goober and the Ghost Chasers"],
  ["wheelie", "Wheelie and the Chopper Bunch"],
  ["funky-phantom", "The Funky Phantom"],
  ["inch-high", "Inch High, Private Eye"],
];

export function createSeed() {
  const shows = [
    ...action.map(([id, title]) => ({ id, title, channel: migratedShowChannel(id, 'action'), imdbUrl: null, episodes: [] })),
    ...ADDITIONAL_SCIFI_SERIES.map(([id, title]) => ({id, title, channel: 'scifi', imdbUrl: null, episodes: []})),
    ...cartoons.map(([id, title]) => ({ id, title, channel: 'cartoons', imdbUrl: null, episodes: [] })),
  ];
  shows.push({id: MOVIE_SHOW_ID, title: 'Midnight Matinee', channel: 'scifi', imdbUrl: null, episodes: MOVIE_WISHLIST.map((title, index) => ({id: `movie-wishlist-${index + 1}`, title, season: 0, number: index + 101, durationSeconds: null, group: '', kind: 'episode', sources: []}))});
  shows.push({id: COMMERCIAL_SHOW_ID, title: 'Vintage commercial breaks', channel: 'cartoons', imdbUrl: null, episodes: []});
  shows.find(s => s.id === 'dukes').episodes.push({
    id: 'dukes-high-octane', title: 'High Octane', season: 1, number: 5,
    durationSeconds: 2954.67, group: '', kind: 'episode',
    sources: [{ id: 'dukes-archive', provider: 'archive', availability: 'verified',
      url: 'https://archive.org/download/the-dukes-of-hazzard-s-01-e-05-high-octane/The%20Dukes%20of%20Hazzard%20S01E05%20%20High%20Octane.mp4' }],
  });
  shows.find(s => s.id === 'gi-joe').episodes.push({
    id: 'joe-cobra-strikes', title: 'The Cobra Strikes · original miniseries', season: 1, number: 1,
    durationSeconds: null, group: 'The M.A.S.S. Device', kind: 'episode',
    sources: [{ id: 'joe-tubi', provider: 'tubi', availability: 'verified',
      url: 'https://tubitv.com/tv-shows/301812/s01-e01-the-cobra-strikes' }],
  });
  shows.push({ id: 'saturday-simulator', title: 'Saturday Morning Simulator', channel: 'cartoons', imdbUrl: null,
    episodes: [{ id: 'simulator-107', title: 'Saturday Morning Cartoons · compilation #107',
      season: 0, number: 107, durationSeconds: 33116, group: '', kind: 'episode',
      sources: [{ id: 'simulator-youtube', provider: 'youtube', availability: 'unverified',
        url: 'https://www.youtube.com/watch?v=RmycafPZFl8' }] }],
  });
  return { version: 1, epoch: Date.UTC(2026, 0, 1) / 1000, shows,
    settings: { channel: 'mixed', bumpers: true, commercialCount: 'random', rotation: 'random', shuffleSeed: 1984, storiesPerTurn: 1, streamShow: null } };
}
