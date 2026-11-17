# Channel dials

The television cabinet has two tuning buttons. The top button advances through playable shows in the selected channel, wrapping at the end. The bottom button starts a new random stream. Stream settings selects a mix within the current channel, one random show, or everything. A one-show random selection avoids the current show when alternatives exist. Only checked station sources with known runtimes qualify; commercials and external-only sources are excluded.

Tuning resets the station epoch and starts playback. Browser autoplay policies and provider availability still apply. The random-dial preference is saved independently of the catalog. The cabinet buttons remain usable in Fill window and support keyboard activation. The None cabinet theme hides them; existing stream controls remain available.

## Feedback

Dial click & static burst defaults on and persists independently. The sound is an original, locally synthesized mechanical click and filtered noise lasting 112 milliseconds. Audio starts only after a dial gesture, follows the player’s mute and volume, and requires no downloaded audio. Repeated clicks stop the previous sound. Unsupported audio or blocked storage does not prevent tuning.

The visual burst uses the configured static strength and duration, including when the general static toggle is off. Zero strength, reduced motion, and forced colors suppress the burst. Disabling dial feedback suppresses both sound and the dial burst. Automatic episode advancement does not play the dial sound. Cabinet styling and tuning feedback are independently implemented; MyRetroTVs inspired the interaction.

## Validation

All 96 automated tests pass, including eligible-show filtering, wraparound, random modes, audio lifecycle, mute and volume, persistence, and forced visual pulses. An isolated headless browser verified next-show tuning, keyboard activation, all three random modes, feedback persistence, expanded playback controls, mobile touch sizes, and page overflow.
