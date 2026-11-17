# Saved Channel 00 episode queue

## Behavior

A guide episode opens an action menu with Play now, Play next on 00 and Add to end of 00. Right-click opens the same menu. Tapping provides the mobile interaction. Commercial blocks are not added as episodes. Hovering shows a short buddy hint without contacting the AI service.

Play next inserts after the currently playing or saved queue episode; without an anchor it inserts at the beginning. Add to end appends. Duplicate episodes are not added twice. The Your Channel drawer supports move up/down, remove, play now and resume. Adding an item does not change the active source. The queue contains at most 100 distinct episodes and stops after its final item. Existing AI-created show mixes remain saved as a separate mode. Ordinary station schedules are unchanged.

## Storage and catalog boundaries

The queue stores only show, episode and source references in local viewing preferences. It is preserved when the shared catalog refreshes; unavailable entries remain labeled and are skipped when resolving playback. Only checked Archive and YouTube episode sources with known runtimes can play in the queue. No source definitions are inserted into the shared catalog.

Queue order, mode and position persist on the same browser or app installation. Cross-device synchronization and exact episode-queue sharing are not implemented. The existing episode share action remains available. Sharing an exact episode queue reports that limitation instead of producing a misleading general-channel link.

## Pause and resume

Archive metadata applies the initial offset once per player session. Repeated metadata events after interruption must not reset current playback to its original offset. Page-cache navigation checkpoints and pauses a session without disposing it. Returning from cache restores a lost/evicted player at the checkpoint, without autoplay. Full navigation saves a local bookmark and disposes the old session. A fresh load offers Resume last episode after the catalog is available.

Bookmarks contain local catalog references and position, not media URLs. Queue playback has its own saved checkpoint. Pausing moves the display into time-shifted viewing; resuming does not deliberately retune to the live clock. Returning to live remains explicit.

## Verification scope

Unit tests cover ordering, persistence across catalog refresh, unavailable sources, duplicate rejection, non-wrapping advancement, repeated metadata and page-cache lifecycle. Browser checks cover guide action menus, right-click, reload persistence, mobile layout and playback resume. Automated WebKit tests approximate browser-engine behavior and are not physical iOS device verification.
