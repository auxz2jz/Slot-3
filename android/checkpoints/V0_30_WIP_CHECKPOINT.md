# Android checkpoint — v0.30.0 WIP shared sync

Status: **IN PROGRESS / NOT VERIFIED**

## Protected baseline

Android v0.29.0 / build 33 is the last user-verified baseline.

Baseline artifact:
`BoxInventoryAndroid_v0.29.0_AndroidStudio.zip`

Baseline SHA-256:
`e581dd5415eed02de970d40ea00b84d6589184db1ead022fb68bffa91c477afe`

## Current WIP source checkpoint

Artifact:
`BoxInventoryAndroid_v0.30.0_WIP_CrossPlatformSync_Checkpoint.zip`

SHA-256:
`9f4fe7f828e0ad382e07305c4b18c7f3c284514e0cffd0bb944d3a88a7287f9d`

The checkpoint ZIP passed archive-integrity testing.

A reconstructable unified diff is also stored in GitHub:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP.patch`

Patch SHA-256 from the saved local checkpoint:
`0fa0211e30001985ee89e1eb0f035b9ba225f549eb3265162a0080c50ea1f9fe`

The patch captures the exact v0.29 → current v0.30 WIP text/source changes and is intended as an additional recovery path.

## What changed

The Android tree now contains an initial Android implementation of Inventory Sync Protocol v1.

New sync package:

- `GitHubSyncClient.kt`
- `InventorySyncService.kt`
- `SecureTokenStore.kt`
- `SyncState.kt`

Other Android files changed to connect sync lifecycle/state/UI:

- `AIBoxApplication.kt`
- `AppViewModel.kt`
- `AIBoxRoot.kt`
- `app/build.gradle.kts`

Documentation:

- `V0_30_NOTES.md`
- `PROJECT_MEMORY.md`
- `PROJECT_STATUS.md`

## Data contract

See `shared/DATA_FORMATS_AND_INTERFACES.md`.

## Known status

- No Room migration required.
- Local backup format remains v12.
- Windows implementation is not created or verified by this Android work.
- End-to-end cross-platform sync cannot be verified until the Windows implementation exists.
- This Android checkpoint still requires Android build/device testing.

## Exact recovery action

If the v0.30 work fails or becomes confused, return to v0.29 verified source. Do not promote v0.30 to VERIFIED until the user explicitly confirms it.

## Reviewed WIP2 safety checkpoint

Status: **IN PROGRESS / NOT VERIFIED**

Artifact:
`BoxInventoryAndroid_v0.30.0_WIP2_SyncSafety_Checkpoint.zip`

SHA-256:
`ddafd842c665300c88d39e9ccbe653fa63fe01e818ed8cf11b2da0c921d1353f`

Incremental patch from the original v0.30 handoff:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP2_SyncSafety.patch`

Incremental patch SHA-256:
`0ae88f2671837942cb2fdbffc25269e683beda6a99f8c23bab4daa3a77a99630`

Review hardening:
- remote pulls preserve the complete pre-pull Room record set until Android reproduces the remote logical hash;
- failed post-apply reproduction restores the previous Android records rather than leaving the failed remote state active;
- the shared protocol defines exact canonical ordering for every logical array so Android and Windows hash the same record order;
- the new sync package passed Kotlin type/signature compilation against local Android/data interface stubs.

Build status:
- full Android Gradle/APK build is still pending;
- the review environment did not have Gradle 9.1/Android dependencies cached and could not download them.

Exact next action: build WIP2 with a real Android Gradle toolchain, then fix only actual build/test evidence before producing the device-test candidate.

## Reviewed WIP3 media safety checkpoint

Status: **IN PROGRESS / NOT VERIFIED**

Artifact:
`BoxInventoryAndroid_v0.30.0_WIP3_MediaSafety_Checkpoint.zip`

SHA-256:
`7a2d03bfbc5d2ae2461df76ffa39f71b6182195ceb46bd80b6068b6fdddafdf1`

Incremental patch from WIP2:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP3_MediaSafety_from_WIP2.patch`

Local incremental patch SHA-256:
`c167108c9d6ecc0c35afafd0d5cb81beec9616ebff4e619458657b1c17af8785`

Additional hardening:
- every remote media entry must have a valid SHA-256, protocol path, nonblank MIME type, unique identity, and supported size;
- every item/additional-photo media reference must exist in the snapshot media table;
- Android no longer guesses a fallback JPG path for undeclared remote media;
- remote media downloads are bounded to 50 MiB, including raw GitHub content responses;
- imported files retain the declared media extension;
- the updated sync package passes Kotlin type/signature compilation against local Android/data interface stubs.

Shared media-contract commit: `d2fdaa6598dcc6688df620db6ab44f197ea9f9b2`.

Full Android Gradle/APK build remains pending because the complete Android source is artifact-based rather than checked into Slot-3 and this execution environment cannot download the required Gradle/Android toolchain. WIP3 remains unverified.

## Reviewed WIP4 foreground sync checkpoint

Status: **IN PROGRESS / NOT VERIFIED**

Artifact:
`BoxInventoryAndroid_v0.30.0_WIP4_ForegroundSync_Checkpoint.zip`

SHA-256:
`b506512dcc17336a53dd30e0419ed4a7f1a7edda44b4dc07ab2530f42745ae16`

Incremental patch from WIP3:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP4_ForegroundSync_from_WIP3.patch`

Local incremental patch SHA-256:
`97083519c1235530e3da2aa1bed8e090d6ac8d4f13fc84283d29d48553f89625`

Additional hardening:
- startup/periodic automatic sync waits until local default data is ready;
- periodic checking is tied to active foreground lifecycle rather than ViewModel lifetime;
- leaving the foreground stops future periodic scheduling;
- returning to active use performs a fresh sync check and resumes the five-minute cycle;
- cancellation of a foreground automatic check is treated as paused work rather than a false sync error;
- manual Sync now remains independent.

The sync package continues to pass local Kotlin type/signature checks. Full Android Gradle/APK build remains pending; v0.29 remains the protected VERIFIED baseline and WIP4 is not VERIFIED.

## Observed WIP4 build/sync evidence

The user successfully compiled WIP4 with the real Android toolchain. Android successfully published the initial runtime snapshot, later pushed an inventory item and three SHA-addressed JPEG media files, and a no-change sync reported the lightweight revision-check path. This is partial evidence only; it does not yet verify pull/conflict/full cross-platform behavior.

## Reviewed WIP5 snapshot-size monitor checkpoint

Status: **IN PROGRESS / NOT VERIFIED**

Artifact:
`BoxInventoryAndroid_v0.30.0_WIP5_SnapshotSizeMonitor_Checkpoint.zip`

SHA-256:
`d9426c66a3d5050034d5781d89a689fb076e7e79617deeab976f70148c821838`

Incremental code patch from WIP4:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP5_SnapshotSizeMonitor_from_WIP4.patch`

Code-patch SHA-256:
`4036150be735832a450e44076375fe61a05f750487d1f6ee0c9ab8e76a607517`

WIP5 behavior:
- the sync status reports the generated local `snapshot.json` byte size after a sync check;
- under 10 MiB is normal;
- 10–20 MiB shows an advisory growth notice;
- 20 MiB and above recommends planning a future chunked snapshot format;
- the thresholds do not block synchronization;
- photos/media remain separate from the JSON snapshot;
- repository, branch, and token remain user-configured and are not hard-coded;
- Inventory Sync Protocol v1 is unchanged.

Static checks:
- `SyncState.kt` compiles as pure Kotlin;
- edited Android files show no parser/import-order errors in the available syntax scan;
- source scan found no hard-coded runtime repository name and no `github_pat_` token literal;
- ZIP archive integrity test passed.

Exact next action: user compiles/installs WIP5 and verifies the snapshot-size line appears after Sync now. If that passes, continue with the controlled GitHub → Android pull test.
