# Apple TV TestFlight upload — 0.8.21 (4)

Date: 2026-11-20. Repository: https://github.com/doctor-ew/yata.
Source commit: e0a3d15, branch fix/tvos-autoplay-channel.

## Observed result

Release archive succeeded for generic tvOS. Xcode exported and uploaded com.doctorew.yata, AppleTVOS, version 0.8.21, build 4. Minimum OS: tvOS 17.0.

At 10:25:26 local time, Xcode reported "Uploaded package is processing", "Upload succeeded", "Uploaded YATA", and "EXPORT SUCCEEDED". The upload process exited 0. This confirms upload acceptance, not completed TestFlight processing or tester availability.

Archive: /private/tmp/yata-tvos-testflight-0.8.21-4/YATA.xcarchive
Archive log: /private/tmp/yata-tvos-testflight-archive.log
Upload log: /private/tmp/yata-tvos-testflight-upload.log

## Beta notes

Apple TV now opens Watch and automatically plays the last available channel, falling back to 01. Includes channel navigation, Next program, automatic end-of-media advance, Library and About. Simulator autoplay and remote channel activation were observed. Catalog integrity and channel-selection tests passed before archiving.

Channel 00 queues and shared wall-clock scheduling remain unimplemented. The current native rotation starts from the beginning when tuned. No new iOS build was uploaded in this task.

## Follow-up

Check processing and existing tester groups in App Store Connect. Browser host was unavailable; native Google Chrome access was denied by Computer Use. Tester access was not changed and no beta-review submission was made.

Remote Pensieve handoff completed through the signed-in browser at https://pensieve.doctorew.com in the YATA private pool. Saved "YATA Apple TV TestFlight handoff — 2026-11-20", then queued indexing and searched "YATA Apple TV TestFlight handoff 0.8.21 build4 e0a3d15". The new handoff returned as the first search result. This verifies remote persistence and retrieval. The separate CLI/MCP personal credential was not repaired. The implementation/upload commits are still local on fix/tvos-autoplay-channel; transfer that branch before cloud continuation.
