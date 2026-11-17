# Vintage commercial breaks

## Scope and experience

Implements [issue 13](https://github.com/doctor-ew/floating-browser/issues/13). Add an optional shared pool of vintage commercial clips between complete stories. Commercial breaks default to on for new catalogs following issue 14; importing the starter pack preserves the viewer’s saved On/Off preference. Enable **Vintage commercial breaks + my bumpers** in Stream settings. The existing Next button skips a commercial. Toggling the option preserves current playback and affects upcoming breaks.

The shared pool applies to action, cartoons, mixed and show-only streams, including manual episode queues. Insert one break after a complete story group. Grouped multipart stories stay together. Manual show queues finish on the last program with no trailing commercial; looping stations can end their cycle with a break. Existing checked user bumpers remain in the selected show/channel pool.

## Starter pack

Fourteen standalone clips, approximately 30 seconds each, with original-commercial years stated in the source titles. These are distinct from modern upload dates. Full decoding, audio language, independent broadcast dating and rights clearance were not verified.

| Clip | Seconds | Source |
| --- | ---: | --- |
| Mattel - He-Man & The Masters Of The Universe - Trap Jaw (Commercial, 1983) | 30.29 | [Archive](https://archive.org/details/youtube-yo9cFl4MNXs) |
| Kellogg's Apple Jacks - "Pinball" (Commercial, 1982) | 30.72 | [Archive](https://archive.org/details/youtube-Jovnn95ne24) |
| Powdered Donutz Cereal (Commercial, 1982) | 30.72 | [Archive](https://archive.org/details/youtube-vAVc0ushE_k) |
| Halfsies Cereal - "Magic Motion Poster / Arcade Game Contest" (Commercial, 1983) | 29.79 | [Archive](https://archive.org/details/youtube-CGliODdPFbc) |
| Stomper SSC Super Cycle By Schaper (Commercial, 1982) | 30.63 | [Archive](https://archive.org/details/youtube-QGBw60pO14A) |
| Activision - Pitfall! with Jack Black (Commercial, 1983) | 30.23 | [Archive](https://archive.org/details/youtube-wfLgSdAAHMA) |
| Parker Brothers - Spider-Man (Commercial, 1982) | 30.30 | [Archive](https://archive.org/details/youtube-vSxszeqiGyg) |
| Kellogg's Frosted Flakes - "Hot Air Balloon Chase" (Commercial, 1983) | 30.09 | [Archive](https://archive.org/details/youtube-IYfeIatbJIw) |
| ColecoVision & Adam - "Sorry, Atari" (Commercial, 1983) | 30.30 | [Archive](https://archive.org/details/youtube-JSxiQRaRvQs) |
| Atari - Super Breakout commercial (USA, 1982) | 30.56 | [Archive](https://archive.org/details/AtariSuperBreakout_Feb7_1982) |
| Post Super Sugar Crisp Cereal Commercial 1982 | 30.42 | [Archive](https://archive.org/details/post-super-sugar-crisp-cereal-commercial-1982) |
| Donkey Kong Jr. Help Save Papa! ( Commercial, 1983) | 30.12 | [Archive](https://archive.org/details/donkey-kong-jr.-help-save-papa-commercial-1983) |
| Nintendo Game And Watch (Commercial, 1983) | 30.28 | [Archive](https://archive.org/details/nintendo-game-and-watch-commercial-1983) |
| 1984 Life Cereal Commercial | 30.74 | [Archive](https://archive.org/details/1984-life-cereal-commercial) |

## Data and scheduling

The reserved collection is `vintage-commercials`; its entries use the existing `bumper` kind. Validation rejects program episodes in this collection and rejects selecting it as a program stream. The collection appears in the library for reviewing, editing, previewing or removing clips. A fourth discovery artifact, `commercials-discovery.json`, joins the additive library import and content revision. The manifest counts program-ready and break-ready entries separately.

Manual queue positions retain the originating show while a global commercial is active. Turning breaks off or deleting a clip preserves navigation to surrounding programs. Program queues continue to allow unchecked manual sources, while scheduled breaks require known runtime and a checked video source. Break selection is deterministic and rotates available clips. Existing saved catalogs and source URLs are deduplicated on repeated installation.

## Validation

All 54 tests and syntax checks pass. Tests cover global and show-only scopes, saved-preference preservation, story grouping, manual ownership/navigation, skip behavior, removal/disable recovery, unchecked-source exclusion, and static packaging. All 14 MP4 endpoints returned HTTP 206, video/mp4 and an MP4 signature for a 32-byte range.

The interactive browser preview host was unavailable, so a visual/end-to-end browser playback check remains pending. No provider video files are mirrored in the static release.

## Inspiration and attribution

[retro-tv-webos](https://github.com/Nikolay1243/retro-tv-webos), inspected at commit `a5bf39535dfd413a7e05230b0f0714623decdf39`, is an independent launcher for Joey Cato’s [MyRetroTVs](https://www.myretrotvs.com/). Its shared category controls include commercials. YATA’s between-story scheduler and clip pack are independently implemented on its existing bumper model. Upstream Floating Browser and Old Time Radio attributions remain intact.

## Source-chain investigation

The launcher’s ATTRIBUTION.md explicitly identifies Joey Cato / MyRetroTVs as the creator of its original experiences and catalog, with videos remaining on the original sites and YouTube. The 1980s site’s shipped bundle loads `./d.json`, labels category `a` as Commercials, interprets each catalog token as an eleven-character video identifier plus one category code, and passes the transformed identifier to YouTube’s player. A bounded sample of public YouTube oEmbed responses confirmed commercial titles from that category. This establishes the delivered static source chain, not live player execution or general playback availability.

Observed assets:

- [1980s catalog](https://80s.myretrotvs.com/d.json), SHA-256 `10b465aa5714931641bd85178668e0d5e6d9c9feecb63aeb1ee16889f1bc1a41`.
- [Delivered application bundle](https://80s.myretrotvs.com/assets/index-DcK-cexO.js), SHA-256 `5dcc0c13bae945fff6a664a8171dd5ab18e034624e79edde410b5082cac9ec81`.
- REA retained parent Evidence: `ev_a247b0fceeb68b77c639dfd1c364c8de890a1a4f8ef12eff087117bb575d0407`; summary Evidence: `ev_a284a819466fbbecd33d254057eca17f3813f6ed51b17f5ebe5d1926d52580e4`. Static syntax analysis succeeded; semantic coverage was partial because of configured retention limits and unresolved dynamic relationships. Exact relevant source expressions and public data were also inspected directly.

The public attribution file and on-screen footer now credit Joey Cato’s MyRetroTVs and Nikolay1243’s launcher separately. Raw upstream catalogs and application scripts are retained only in the local investigation directory, outside the published release. YATA ships its independently reviewed fourteen-clip Archive pack.
