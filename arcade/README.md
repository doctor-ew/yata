# Doctor Ew’s Arcade

## Run

From `nostalgia-tv`, run `node arcade/setup.mjs` once to copy the recovered Dropbox Flash bundles and download EmulatorJS 4.2.3 runtimes. Then run `npm start` and open `http://127.0.0.1:4173/arcade/`.

The setup source is the existing `FlashAndroid` folder in the user's Dropbox `_AI_/rea-work` directory. Originals are not modified. Assets go into the ignored `.local-assets` directory, including runtime licenses and a download/hash manifest. Do not commit the copied game assets.

## Scope

Bible Fight and Viva Caligula use the recovered, modified browser builds, including unlocked content and optional assistance modes. Original art, audio and code retain their owners' rights. Robot Unicorn Attack's Android Java build and other native ports are not included as browser games.

`npm run arcade:classics` restores the eight recorded cartridge/arcade copies after a size and SHA-256 check. The cartridge slot accepts a browser-selected game and optional firmware. It passes browser File objects to a local EmulatorJS frame, retaining the original filenames for disk and cartridge detection. Closing the game destroys the frame and releases its file references. There is no file-upload endpoint. Emulator save data and settings may persist in browser storage. Supported machines are Atari 2600, Commodore 64, NES, SNES, Genesis and Game Boy/Color. Per-title compatibility still requires gameplay checks.

## Hosting boundary

The owner preview listens on loopback and rejects non-loopback Host headers. The public arcade is a separate static release at https://doctorew.com/arcade/. Both use same-origin game resources. The TV release remains separate and does not bundle arcade binaries. The arcade release builder includes an explicit set of browser assets; it excludes APK backups, package archives and preservation manifests. No visible public navigation link is added.

## Attribution

Ruffle is MIT OR Apache-2.0; its licenses remain in each copied runtime. EmulatorJS 4.2.3 is GPL-3.0; its source is https://github.com/EmulatorJS/EmulatorJS/tree/v4.2.3. Included emulator cores have their own upstream licenses. The local runtime redirects the upstream version-check URL to a local version file; setup records the change and retains upstream download hashes. Runtime bundling is local experimentation, not approval to redistribute game or firmware files. Recovered Flash wrappers were created in the user's earlier preservation project and are copied without replacing the originals.


## Adult Swim intake and artwork

`npm run arcade:adult-swim` installs the cataloged GameZIP releases using the recorded Flashpoint metadata. Every package is checked against its recorded size and SHA-256 before extraction. The extraction helper rejects parent-path entries and oversized bundles. Source records cover 134 Flash entries; missing legacy files and non-SWF launchers remain in the Workshop instead of receiving fake play buttons. Initial-load checks do not establish full gameplay or progression compatibility.

`npm run arcade:artwork` restores the original logo artwork. Original logo artwork is stored locally with its source URL and SHA-256 in the artwork manifest. Per-game credits remain with each entry. The original 1983 vector Star Wars arcade game uses MAME 2003 Plus: the MAME 2003 build failed runtime testing. Atari 2600 Star Raiders originally requires a keypad; keypad/controller mapping still needs user gameplay validation. Spy Hunter originally used a dual-control module, so advanced controls also need checking.

## Android and local installation

The arcade has a web-app manifest, home-screen icons and an arcade-scoped service worker. Open it in Android Chrome and use Install app / Add to Home screen. With an authorized ADB connection, `adb reverse tcp:4179 tcp:4179` lets the phone open `http://127.0.0.1:4179/arcade/` on this computer. This does not expose the server to the LAN. Cache storage retains files opened in the arcade for offline use; later levels or games that have not loaded still require the computer connection. Browser storage limits apply.

Six modified Flight Deck packages were copied with authorization from the connected phone. Their extracted browser builds are optional Phone build variants. No phone save data was extracted, and installed apps were not modified. Package hashes and provenance are stored locally under the Android assets directory.

## Secret entrance

On the YATA TV page, enter Up, Up, Down, Down, Left, Right, Left, Right, B, A outside text fields. This opens `/arcade/`. The entry is enabled on loopback and the doctorew.com hosts. The Konami code is an Easter egg, not authentication. The arcade UI and assets remain excluded from the TV static build and ship separately.

## Static release

Run `node scripts/build-arcade.mjs --out <empty-directory>` from `nostalgia-tv`. The builder stages browser game assets with MIME types, SHA-256 hashes and an HTML content security policy. Upload the manifest files under the `arcade/` prefix in the configured S3 bucket, with dependency files before the root HTML. Use the existing CloudFront distribution; keep S3 public-access blocking enabled. The viewer-request function in `deploy/arcade-index-rewrite.js` preserves existing TV/SPA routes, redirects `/arcade` to `/arcade/`, and passes extensionless game companion files through unchanged. Invalidate `/arcade*` after upload. Publish the entry helper before the TV coordinator module.

## Updated controls and mods

The v1.2 preservation packages are sourced from Drew’s authorized Flight Deck download Site. Run `python3 arcade/install-updated-ports.py --source <download-directory>` with those APKs and their `icons` directory. Only browser assets are extracted; APKs and private provenance stay outside the public release. The public release builder includes `ports-v12` and `port-icons`. Its HTML content policy restricts resources to the arcade origin.

The main PLAY build now uses updated touch/keyboard controls and patched SWFs for Tofu Hunter, Pizza City, Amateur Surgeon, Radioactive Teddy Bear Zombies, Rick and Morty, and ATHF Dead Evil. **Archive build** retains the original Flashpoint variant. Rick and Morty has four offline chapters; no cheat inventory is claimed. Nine Billion Miles has its own preserved browser build. Matching launcher illustrations are custom preservation artwork, not official cover files.

Star Wars uses the updated arcade flight controls and optional shield/Force switches. The separate original arcade Spy Hunter adds Gas, Gear and two-token credits; its Atari 2600 port remains separately labeled. After Burner, Double Dragon and NES Knight Rider include their delivered control/mod builds. Desktop Spy Hunter keys: **5** or **Shift** adds a credit, **Enter** starts, **G** accelerates, **H** shifts, arrows steer, Space fires, **S/O/M** use smoke/oil/missiles. Double Dragon uses **Z/X/C** for Punch/Kick/Jump. Cheats start off. Pause / Mods applies the supported game-specific options; neither menu rendering nor brief startup checks establish full gameplay compatibility.

Source handoff: private android-game-preservation Pensieve memory `7c422ac02a3470fe2827b99a5e7e75b58851b942668089fdd6c72ebab2832a9f`, with control and cheat details from memories `75f8adbe862036298725896203760c1ef9a1162a3d25e0d7fffdef50309b2685` and `9be70ba752f00af71990ce8d5eceb4e10ce756679a4011cd4f52f48e7ed8cf57`.
