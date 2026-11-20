# TV preview preflight

Target: separate experimental Android TV sideload APK for the reported onn Full HD / Android TV 14. Evidence: REVIEW.md. Default phone app is not replaced. Source branch: feature/43-onn-android-tv; upstream issue #43; local bead yata-ekp.

Builds, unit tests, remote-focus browser checks and Android TV 14 emulator smoke passed. Physical onn/provider/input coverage remains open. Existing guide browser regression fails identically on main. No stable phone release, store submission, production web deployment or catalog publication is authorized by this preview. A test APK must use a distinct TV filename and prerelease tag, excluded from latest stable release selection. Private keys/media and APK binaries must not enter Git.
