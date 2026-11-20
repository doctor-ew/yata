# FishCenter Live: selected archived broadcasts

Date: 2026-11-20. Related programming work: https://github.com/doctor-ew/yata/issues/48.

## Scope

Add one FishCenter Live collection with twelve archived broadcasts in Comedy. Keep all existing channels and content intact. The bulk archive is excluded following the request to keep the lineup small. FishCenter remains selectable as a single-show stream through Library or the companion.

The selected source descriptions mention Drew. Four explicitly describe replacement/guest hosting: May 11 and October 15, 2015; August 15–16, 2016. The remaining records contain Drew-related segments, calls, songs or references; a mention alone does not establish an on-camera appearance. No identity-by-face inference or complete cast verification is claimed.

| Broadcast date | Selected source reference | Archive item |
| --- | --- | --- |
| 2015-04-14 | Periscope Through Drew’s Stuff; Guess That Drew-Gi-Oh! | [Recording](https://archive.org/details/fishcenter-live-tuesday-april-14th-2015) |
| 2015-04-15 | Mountin’ Drew | [Recording](https://archive.org/details/fishcenter-live-wednesday-april-15th-2015) |
| 2015-04-20 | Top 5 Drew Bumbles | [Recording](https://archive.org/details/fishcenter-live-monday-april-20th-2015) |
| 2015-05-11 | Description says Drew replaces Choe | [Recording](https://archive.org/details/fishcenter-live-monday-may-11th-2015) |
| 2015-07-23 | No Dreweys segment | [Recording](https://archive.org/details/fishcenter-live-thursday-july-23rd-2015) |
| 2015-07-27 | A Drew Hope opening | [Recording](https://archive.org/details/fishcenter-live-monday-july-27th-2015) |
| 2015-07-28 | Calling Drew about bugs | [Recording](https://archive.org/details/fishcenter-live-tuesday-july-28th-2015) |
| 2015-09-23 | Theme credited “Feat. Drew” | [Recording](https://archive.org/details/fishcenter-live-wednesday-september-23rd-2015) |
| 2015-10-15 | Choe Out/Drew In; It Takes Drew | [Recording](https://archive.org/details/fishcenter-live-thursday-october-15th-2015) |
| 2015-10-16 | Drew Hums | [Recording](https://archive.org/details/fishcenter-live-friday-october-16th-2015) |
| 2016-08-15 | Special Guest Hosts Rebecca and Drew | [Recording](https://archive.org/details/fishcenter-live-monday-august-15-2016) |
| 2016-08-16 | Special Guest Host Drew; preview of Drew’s new job | [Recording](https://archive.org/details/fishcenter-live-tuesday-august-16-2016) |

The source review is recorded in `data/fishcenter-selections.json`. Dates and descriptive titles come from Archive metadata. Season/episode numbers remain unset (`0`); the web recordings are not mapped onto the separate eleven-minute television edition.

The 33-second [iGetBumblesDone DrewRap](https://www.youtube.com/watch?v=X69VL19nRzo), uploaded by Drew Schillinger and linked from his public post, is a separate clip. It is excluded from ordinary rotation. The bulk archive and unrelated uses of the word “drew” are also excluded.

## Rotation and compatibility

Random rotation gives each available show a turn; episode-count weighting is not used. The small collection does not add a channel button or a new channel identifier. Its single-show stream remains available independently of the main mix. No station clock or viewer preferences are reset by this publication.

The canonical and older-app feeds both add the collection in the existing Comedy category. Inventory changes from 340 collections / 13,971 entries / 14,285 sources to 341 / 13,983 / 14,297. Every prior show, episode and source is retained, and the registry is unchanged. Compatible existing web and native clients refresh the data; no new APK is required. Packaged release-note text may retain its bundled version until the next app build.

## Media and artwork verification

All twelve files returned public MP4 bytes for bounded HTTP range reads. All twelve were inspected with ffprobe and reported H.264 video and AAC audio; container duration matched Archive metadata within two seconds. The August 16, 2016 recording additionally played in headless Chrome past two seconds at 1280×720 without a media error. This is a playback-start check, not a full-watch guarantee or physical Android/iOS playback test. Regional/provider availability can change.

The library card uses original FishCenter promotional artwork sourced through [TVmaze](https://www.tvmaze.com/shows/17267/fishcenter). No AI imagery is used. TVmaze’s television episode numbering is not attached to the archived web broadcasts. Videos remain on Internet Archive; no program files are bundled or hosted by YATA.

No new retrieval summaries, transcripts, embeddings, companions, AI permissions or native capabilities are added. Three focused catalog tests cover inventory preservation, rejection of bulk/duplicate/short/unreviewed sources and balanced show turns. All 309 Node tests pass.

## Publication receipt

Canonical revision: `58df4f1d5116507d4cb0950ad40249f7dcec0e6ff714d72e2f5c659a8911bcd0`. Older-app projection: `cb97a023280590b08a6c2f3dcb026685dbabefb91ae93cf1d3f7e1391f08b6cc`. Both feeds were read back with exactly twelve FishCenter recordings in Comedy and unchanged channel definitions. Compatibility and cache invalidation report no pending repair.

The shell publisher changed only the original card image, library artwork feed and web release notes. Production Library browsing showed twelve entries, and searching `2016-08-16` returned the recording whose description bills Special Guest Host Drew. The channel-button count stayed unchanged.
