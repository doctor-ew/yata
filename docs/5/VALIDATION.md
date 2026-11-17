# Transport validation

Date: 2026-11-13.

## Automated checks
`npm test`: 32 passing tests. New coverage includes hours without wrapping, invalid/unknown times, clamped seeking, native readiness/disposal, pause/seek/audio behavior, official YouTube control methods, provider playlist navigation, manual show boundaries, Tubi exclusion and repeated station bumper occurrences. Existing catalog, scheduling, import, packaging and server checks remain passing.

`npm run check` and `git diff --check` passed. The static pack automatically includes the new browser transport module.

## Browser observations
Local Chrome preview, using actual Archive and official YouTube playback:

- A-Team playback showed a running elapsed time with total `01:34:55`; transport controls enabled after source metadata arrived.
- Custom Pause held the position at `00:00:34`; Forward 10 moved to `00:00:44` while remaining paused.
- Back 10 and keyboard scrubbing worked. Home and three Right arrows moved the scrubber to `00:00:03` with matching elapsed text.
- Volume keyboard adjustment set both the slider and percentage to 40. Mute set the display to zero; Unmute restored 40 percent.
- Restart sought to zero, resumed playback and retained the selected volume.
- Next from the combined A-Team pilot selected Children of Jamestown, enabled Previous and reset unknown/loading state. Previous returned to the pilot and disabled itself at the start of the show.
- The official He-Man YouTube source reached actual playing state. Its custom bar showed approximately `00:21:24` total duration, retained 40 percent volume and paused through the custom Play/Pause button.

The YouTube seek/audio/playlist methods are additionally covered by the adapter test with an official-API-shaped local stand-in. Browser observation does not establish behavior for every region, advertisement, media source or device volume policy. No mobile viewport test is claimed.

## Review corrections
Independent review found two navigation/state edge cases. Repeated bumpers now retain their exact station queue occurrence and preceding episode identity; the regression test traverses all repeated occurrences without returning to the first bumper. Retry now preserves station/show queue context, occurrence and the latest tracked position after seeking.

## Hosted publication
The account-checked S3 deployment script publishes browser assets under the existing `tv/` prefix and invalidates those CloudFront paths. The catalog data is unchanged. A live release hash/MIME check is recorded with the issue's deployment receipt. The installed native Floating Browser app was not operated.

Publication completed at `2026-11-13T19:07:32.896Z` using CloudFront invalidation `IDBTMMW2DIZG5OJHQT2LH0BI80`. All 16 live release objects matched their package SHA-256 digests and MIME types over HTTPS.
