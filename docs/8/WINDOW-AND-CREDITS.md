# Window-filling video and creator credit

## Scope
Issue [#8](https://github.com/doctor-ew/floating-browser/issues/8) adds **Fill window**, a browser-viewport presentation mode, and creator attribution for Drew Schillinger.

## Window mode
The video region and its transport fill the browser viewport. A visible **Exit window** control restores the page. Escape exits while the enclosing page receives the key; keyboard events inside a cross-origin provider iframe may remain with that provider, so the Exit control stays available. Native/provider fullscreen controls are retained.

The player stays in its original DOM location. Entering/exiting does not recreate the video or YouTube iframe. Background page regions become inert, focus is contained within the player controls, scroll position and preexisting inert/attribute state are restored on exit. The mode works on the standby view and remains active as source playback advances. The control panel remains below the video rather than hiding it behind the player.

## Attribution
The footer credits Drew Schillinger and links to https://github.com/doctor-ew, https://cto2go.co and https://doctorew.com. The personal name and GitHub URL were confirmed through the public GitHub profile; the other URLs were supplied by the user. Current local/hosted source guides include the same attribution. Chris Hansen's upstream credit and MIT notice are preserved.

## Validation
41 existing/new automated tests passed, including window-mode lifecycle, player placement, Escape, focus restoration, scroll restoration, preexisting inert-state restoration and disposal. Syntax and whitespace checks passed.

The local preview exposed the Fill window control. A mode-entry browser automation attempt was interrupted when the active browser context changed; no successful visual viewport-size or cross-provider uninterrupted-playback observation is claimed for this run. The lifecycle test establishes that the implementation leaves the player node in place. Hosted publication is checked separately by release asset digests and MIME types.

The independent domain security review is stored privately outside the public repository. This app update does not change S3 access policy, CloudFront security configuration, authentication, firewall subscriptions or billing plans.

## Publication
Published at `2026-11-13T19:41:35.944Z` to https://doctorew.com/tv/. All 18 live release objects matched their package SHA-256 digests; the new window-mode module returned `text/javascript; charset=utf-8`. Live HTML contains the YATA name, creator name, all three attribution URLs and both window controls. CloudFront invalidation `IBNUAS4HGD9R7KI8LVA2KNFDH6` completed.
