export const CHANNELS = [
  { id: 'mixed', number: '01', name: 'Drew TV', subtitle: 'Everything, shuffled', accent: '#ffc66e' },
  { id: 'action', number: '02', name: 'Action Adventure', subtitle: 'Random heroes. Impossible missions.', accent: '#ff927b' },
  { id: 'cartoons', number: '03', name: 'Saturday Morning', subtitle: 'Random cartoons. Add cereal.', accent: '#ac9aff' },
];

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
];
const cartoons = [
  ['he-man', 'He-Man and the Masters of the Universe'], ['gi-joe', 'G.I. Joe: A Real American Hero'],
  ['transformers', 'The Transformers'], ['mighty-orbots', 'Mighty Orbots'],
  ['thundercats', 'ThunderCats'], ['voltron', 'Voltron'], ['mask', 'M.A.S.K.'],
  ['silverhawks', 'SilverHawks'], ['dungeons-dragons', 'Dungeons & Dragons'],
  ['centurions', 'The Centurions'], ['thundarr', 'Thundarr the Barbarian'],
  ['inspector-gadget', 'Inspector Gadget'],
];

export function createSeed() {
  const shows = [
    ...action.map(([id, title]) => ({ id, title, channel: 'action', imdbUrl: null, episodes: [] })),
    ...cartoons.map(([id, title]) => ({ id, title, channel: 'cartoons', imdbUrl: null, episodes: [] })),
  ];
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
    settings: { channel: 'mixed', bumpers: false, rotation: 'random', shuffleSeed: 1984, storiesPerTurn: 1, streamShow: null } };
}
