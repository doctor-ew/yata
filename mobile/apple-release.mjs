import {execFileSync} from 'node:child_process';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const value = flag => args[args.indexOf(flag) + 1];
const platform = args.includes('--platform') ? value('--platform') : '';
const team = args.includes('--team') ? value('--team') : '';
const build = args.includes('--build') ? value('--build') : '';
const unsigned = args.includes('--unsigned');
const upload = args.includes('--upload');
if (!['ios', 'tvos'].includes(platform) || !/^[1-9][0-9]*$/.test(build || '') ||
    (!unsigned && !/^[A-Z0-9]{10}$/.test(team || '')) || (unsigned && upload)) {
    throw Error('Use --platform ios|tvos --build NUMBER and either --team TEAMID [--upload] or --unsigned. Upload requires an authenticated Apple Developer account.');
}
const run = (exe, argv, cwd = root) => execFileSync(exe, argv, {cwd, stdio: 'inherit'});
run(process.execPath, ['build.mjs']);
if (platform === 'ios') run(path.join(root, 'node_modules/.bin/cap'), ['sync', 'ios']);
else run(process.execPath, ['tvos/prepare.mjs']);
const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
const output = path.join(root, 'artifacts', `apple-${platform}-${version}-${build}`);
await mkdir(output, {recursive: true});
const archive = path.join(output, 'YATA.xcarchive');
run('xcodebuild', [
    '-project', platform === 'ios' ? 'ios/App/App.xcodeproj' : 'tvos/YATA.xcodeproj',
    '-scheme', platform === 'ios' ? 'App' : 'YATA', '-configuration', 'Release',
    '-destination', platform === 'ios' ? 'generic/platform=iOS' : 'generic/platform=tvOS',
    '-archivePath', archive, `MARKETING_VERSION=${version}`, `CURRENT_PROJECT_VERSION=${build}`,
    ...(unsigned ? ['CODE_SIGNING_ALLOWED=NO'] : [`DEVELOPMENT_TEAM=${team}`, '-allowProvisioningUpdates']),
    'archive'
]);
if (upload) {
    const options = path.join(output, 'ExportOptions.plist');
    await writeFile(options, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>method</key><string>app-store-connect</string>
<key>destination</key><string>upload</string>
<key>signingStyle</key><string>automatic</string>
<key>teamID</key><string>${team}</string>
<key>manageAppVersionAndBuildNumber</key><false/>
<key>uploadSymbols</key><true/>
</dict></plist>`);
    run('xcodebuild', ['-exportArchive', '-archivePath', archive, '-exportOptionsPlist', options,
        '-exportPath', path.join(output, 'export'), '-allowProvisioningUpdates']);
}
console.log(upload ? 'Upload command completed. Check App Store Connect processing and TestFlight status.' :
    `Archive created at ${archive}${unsigned ? ' (unsigned; cannot upload)' : ''}`);
