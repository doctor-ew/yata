# Local arcade

## Run

From `nostalgia-tv`, run `node arcade/setup.mjs` once to copy the recovered Dropbox Flash bundles and download EmulatorJS 4.2.3 runtimes. Then run `npm start` and open `http://127.0.0.1:4173/arcade/`.

The setup source is the existing `FlashAndroid` folder in the user's Dropbox `_AI_/rea-work` directory. Originals are not modified. Assets go into the ignored `.local-assets` directory, including runtime licenses and a download/hash manifest. Do not commit the copied game assets.

## Scope

Bible Fight and Viva Caligula use the recovered, modified browser builds, including unlocked content and optional assistance modes. Original art, audio and code retain their owners' rights. Robot Unicorn Attack's Android Java build and other native ports are not included as browser games.

The cartridge slot accepts a browser-selected game and optional firmware. It passes browser File objects to a local EmulatorJS frame, retaining the original filenames for disk and cartridge detection. Closing the game destroys the frame and releases its file references. There is no file-upload endpoint. Emulator save data and settings may persist in browser storage. Supported machines are Atari 2600, Commodore 64, NES, SNES, Genesis and Game Boy/Color. Per-title compatibility still requires gameplay checks.

## Local boundary

The server listens on loopback and the arcade rejects non-loopback Host headers. Its content policy restricts network connections to this origin. The existing static TV release uses an explicit file list and excludes the arcade directory and game assets. No arcade deployment or public navigation link is added. Public distribution permissions remain unresolved.

## Attribution

Ruffle is MIT OR Apache-2.0; its licenses remain in each copied runtime. EmulatorJS 4.2.3 is GPL-3.0; its source is https://github.com/EmulatorJS/EmulatorJS/tree/v4.2.3. Included emulator cores have their own upstream licenses. The local runtime redirects the upstream version-check URL to a local version file; setup records the change and retains upstream download hashes. Runtime bundling is local experimentation, not approval to redistribute game or firmware files. Recovered Flash wrappers were created in the user's earlier preservation project and are copied without replacing the originals.
