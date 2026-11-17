# Character-hosted personal channels

## Purpose

Allow viewers to request shows, themes, or moods and review an AI-curated lineup drawn from checked TV sources. The public catalog remains owner-published.

## Behavior

MAKE A CHANNEL opens the programming dialog beneath the television. A host is randomly assigned from Captain Stubing, Arnold Jackson, Jabberjaw, Benson, Mr. T, Murdock, Twiki, and the original Starbuck. Different host avoids immediately repeating the current host. Available portraits carry a credit link; missing portraits retain the host label.

The viewer submits up to 1,000 characters. The guarded chatbot endpoint receives bounded show descriptors only. The server returns a title, introduction, and at most 12 offered show IDs. Both server and browser validate the result. An empty selection explains a mismatch and cannot start playback. Closing the dialog cancels the browser request; it cannot retract inference already accepted by the server.

Tune this channel revalidates current availability and starts the existing balanced station queue. Commercial preferences and transport controls apply. The ordinary TV Guide continues to show full channels. Selecting an ordinary channel or a specific show exits the bespoke selection.

## Data and access

The personal selection uses the existing viewer preferences, separate from published source definitions. Only owner publication changes the shared catalog. A master refresh retains valid personal IDs and discards removed IDs. Films and commercial collections are not offered as program shows. Browser verification grants are memory-only; existing server quota limits and receipt protection apply. No provider credentials are shipped in the client. The widget site key is public configuration.

Benson adds 157 numbered episode entries with successful video-range checks. Existing catalog entries are preserved; discovery does not establish complete coverage, licensing, or future availability.

## Validation

Node tests cover selection validation, custom queue membership, full-guide independence, preference refresh, and finite host rotation. Browser integration exercises review before playback, personal persistence, queue navigation, rejected unknown IDs, no-match and service errors, keyboard dismissal, and narrow-screen layout. AI and media stand-ins isolate browser checks; separate authenticated live inference probes verify the deployed planner.
