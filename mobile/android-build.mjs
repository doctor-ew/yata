import{execFileSync}from'node:child_process';import{existsSync}from'node:fs';import{mkdir,copyFile}from'node:fs/promises';import path from'node:path';import{homedir}from'node:os';import{fileURLToPath}from'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
let javaHome=process.env.JAVA_HOME;
try{javaHome=execFileSync('mise',['where','java@temurin-21.0.13+9.0.LTS'],{encoding:'utf8'}).trim();}catch{if(!javaHome)throw Error('Install JDK 21 and set JAVA_HOME.');}
const sdk=[process.env.ANDROID_HOME,process.env.ANDROID_SDK_ROOT,path.join(homedir(),'Library/Android/sdk')].find(dir=>dir&&existsSync(path.join(dir,'platforms/android-36')));if(!sdk)throw Error('Install Android SDK platform 36 and set ANDROID_HOME.');
const env={...process.env,JAVA_HOME:javaHome,ANDROID_HOME:sdk,ANDROID_SDK_ROOT:sdk};
execFileSync(process.execPath,['build.mjs'],{cwd:root,env,stdio:'inherit'});
execFileSync(path.join(root,'node_modules/.bin/cap'),['sync'],{cwd:root,env,stdio:'inherit'});
execFileSync(path.join(root,'android/gradlew'),['-p',path.join(root,'android'),'assembleDebug'],{cwd:root,env,stdio:'inherit'});
await mkdir(path.join(root,'artifacts'),{recursive:true});await copyFile(path.join(root,'android/app/build/outputs/apk/debug/app-debug.apk'),path.join(root,'artifacts/YATA-0.8.3-android-debug.apk'));console.log('APK: artifacts/YATA-0.8.3-android-debug.apk');
