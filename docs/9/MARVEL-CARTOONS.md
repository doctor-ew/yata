# Marvel cartoon library expansion

## Scope

Add Spider-Man and His Amazing Friends and the 1982 animated Incredible Hulk to Saturday Morning and the mixed stream. Retain the existing live-action Incredible Hulk and The Fall Guy entries.

## Source selection

- Spider-Man: [reviewed collection](https://archive.org/details/spider-man-and-his-amazing-friends_202403). Retain 24 distinct stories, with seasons containing 13, 3, and 8 stories. Collapse zero-padded and unpadded filenames by explicit season/episode. The alternate collection titled Full Series was inspected but omitted because it lacks several stories.
- Hulk: [reviewed English collection](https://archive.org/details/incredible-hulk-1982-cartoon-series). Retain episodes 1–13. Exclude the five-second title card. Season remains zero because source filenames provide only episode numbers.
- Both collections: retain only matching series filenames and runtimes between 1,000 and 1,900 seconds. YouTube discovery is pending for these additions.

## Verification

The first and last retained episode of each addition returned HTTP 206, video/mp4, and an MP4 file signature for a 32-byte range request. Endpoint checks are recorded in the cartoon discovery artifact. These checks establish sampled endpoint behavior, not complete browser decoding, rights clearance, or future availability.

A new content revision triggers additive installation for existing browser catalogs. Existing shows, sources, and channel settings remain intact. The library test covers migration from a catalog lacking the two additions.
