import{execFileSync,spawnSync}from'node:child_process';
import{existsSync}from'node:fs';
import{readFile,mkdir,writeFile}from'node:fs/promises';
import path from'node:path';
import{fileURLToPath}from'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),args=process.argv.slice(2),get=name=>{const index=args.indexOf(name);return index<0?null:args[index+1];};
const allowed=new Set(['--check','--simulator','--upload','--team','--build']);for(let i=0;i<args.length;i++){if(!allowed.has(args[i]))throw Error(`Unknown option: ${args[i]}`);if(['--team','--build'].includes(args[i])){if(!args[i+1]||args[i+1].startsWith('--'))throw Error(`Missing value for ${args[i]}`);i++;}}
const team=get('--team')||process.env.YATA_APPLE_TEAM_ID,build=get('--build')||'1';
if(!/^[1-9]\d{0,8}$/.test(build))throw Error('Use a positive numeric iOS build number.');
if(team&&!/^[A-Z0-9]{10}$/.test(team))throw Error('Use the verified 10-character Apple development team ID.');
if(args.includes('--upload')&&args.includes('--simulator'))throw Error('A simulator build cannot be uploaded.');
const env={...process.env};if(!env.DEVELOPER_DIR&&existsSync('/Applications/Xcode.app/Contents/Developer'))env.DEVELOPER_DIR='/Applications/Xcode.app/Contents/Developer';
let xcode;try{xcode=execFileSync('xcodebuild',['-version'],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']});}catch{throw Error('Full Xcode is required. Install Xcode, finish its first-launch setup, and select it as the developer directory. Command Line Tools alone cannot build an iOS app.');}
const version=Number(xcode.match(/Xcode\s+(\d+)/)?.[1]);if(!Number.isFinite(version)||version<26)throw Error('Capacitor 8 requires Xcode 26 or newer.');
console.log(xcode.trim());
const project=path.join(root,'ios/App/App.xcodeproj');if(!existsSync(project))throw Error('The iOS project is missing.');
const output=execFileSync('xcodebuild',['-list','-json','-project',project],{env,encoding:'utf8',maxBuffer:4000000});const list=JSON.parse(output.slice(output.indexOf('{')));if(!list.project?.schemes?.includes('App'))throw Error('Xcode did not expose the App scheme. Enable and share the App scheme before archiving.');
if(args.includes('--check')){console.log('Xcode and the App scheme are available. Signing and App Store Connect access are checked during archive/upload.');process.exit(0);}
if(!args.includes('--simulator')&&!team)throw Error('Select your Apple developer team with --team or YATA_APPLE_TEAM_ID before archiving.');
const run=(command,argv)=>execFileSync(command,argv,{cwd:root,env,stdio:'inherit'});
run(process.execPath,['build.mjs']);run(path.join(root,'node_modules/.bin/cap'),['sync','ios']);
const app=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')),artifacts=path.join(root,'artifacts/ios',`YATA-${app.version}-${build}`);await mkdir(artifacts,{recursive:true});
const common=['-project',project,'-scheme','App','-configuration','Release',`MARKETING_VERSION=${app.version}`,`CURRENT_PROJECT_VERSION=${build}`];
if(args.includes('--simulator')){run('xcodebuild',[...common,'-destination','generic/platform=iOS Simulator','-derivedDataPath',path.join(artifacts,'DerivedData'),'CODE_SIGNING_ALLOWED=NO','build']);console.log(`Simulator build: ${artifacts}`);process.exit(0);}
const archive=path.join(artifacts,'YATA.xcarchive');run('xcodebuild',[...common,'-destination','generic/platform=iOS','-archivePath',archive,`DEVELOPMENT_TEAM=${team}`,'-allowProvisioningUpdates','archive']);
// Verify supported export identifiers against the installed tool before creating its configuration.
const helpResult=spawnSync('xcodebuild',['-help'],{env,encoding:'utf8'});const help=String(helpResult.stdout||'')+String(helpResult.stderr||'');
for(const identifier of['app-store-connect','destination','teamID','signingStyle','manageAppVersionAndBuildNumber'])if(!help.includes(identifier))throw Error(`Installed Xcode export help did not verify ${identifier}. The archive is retained; review its export options in Xcode.`);
const destination=args.includes('--upload')?'upload':'export';
const xml=`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>destination</key><string>${destination}</string><key>teamID</key><string>${team}</string><key>signingStyle</key><string>automatic</string><key>manageAppVersionAndBuildNumber</key><false/></dict></plist>`;
const exportOptions=path.join(artifacts,'ExportOptions.plist');await writeFile(exportOptions,xml);run('xcodebuild',['-exportArchive','-archivePath',archive,'-exportPath',path.join(artifacts,'export'),'-exportOptionsPlist',exportOptions,'-allowProvisioningUpdates']);
console.log(args.includes('--upload')?'Upload completed. Confirm Apple processing status in App Store Connect before inviting testers.':`Signed export: ${path.join(artifacts,'export')}`);
