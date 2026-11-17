# Playback transport controls

## Objective
Implement [issue #5](https://github.com/doctor-ew/floating-browser/issues/5): make scrubbing, audio and episode navigation available in a visible control bar for both playable providers.

## User controls
The bar provides play/pause, back/forward ten seconds, restart, previous/next episode, mute/unmute, volume percentage and a keyboard-accessible position slider. Elapsed and total duration use hours, minutes and seconds, for example `00:00:35 out of 00:47:25`. Hours do not wrap at 24. Unknown duration is shown as `--:--:--`, with seeking disabled until the provider supplies a finite duration.

The bar polls the current session's actual state every 250 milliseconds. Dragging previews the requested position; committing the slider seeks once. Audio choices carry between episodes for the current page session, and changes made in native/provider controls are reflected back in the bar. Native Archive controls and the official YouTube controls remain available. Device-level volume restrictions can limit browser volume changes.

## Provider interface
`src/players.mjs` introduces session methods `getState`, `pause`, `seek`, `setVolume` and `setMuted`, alongside the existing `play`/`dispose`. Native media operations target the actual video element. YouTube operations use the official IFrame API's `seekTo`, `pauseVideo`, `setVolume`, `mute`, `unMute`, state/time/duration readers and playlist navigation. No iframe contents are inspected or modified.

New `src/transport.mjs` defines `playbackTime`, `seekPosition`, `playbackQueue` and `adjacentPlayback`. Seeking is clamped to the media bounds and unavailable before readiness or after disposal. Unknown media duration does not use a fabricated catalog value. Outbound-only Tubi playback does not expose in-app media controls.

## Navigation and state
Manual playback navigates playable source entries within the selected show, sorted by season and episode. Tubi-only items are omitted. Unchecked YouTube videos can be opened manually. Manual navigation stops at the first and last entry.

Station playback navigates its channel's checked schedule and wraps. Active station state carries the exact queue occurrence and its preceding episode identity so repeated bumpers do not send navigation back to the first occurrence. Explicit YouTube playlists use the official player's previous/next methods.

Seeking and restarting change the display to watching on the user's time while preserving station-versus-show queue context. Restart seeks to zero and plays without recreating the source. Retry preserves queue context and the latest observed position. New source selection disposes the old session and clears any pending scrub gesture.

## References
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)
- [HTMLMediaElement currentTime](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime)
- [HTMLMediaElement volume](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume)

## Publication
Update the existing S3 static deployment using its account-checked deployment script. Preserve catalog data, the original homepage and existing edge routing. No native Floating Browser operation is included.
