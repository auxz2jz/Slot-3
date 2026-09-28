# Android Inventory Box — Platform Status

Ownership: **Android chat/workflow**

Do not use this file to record Windows implementation status.

## ANDROID LAST VERIFIED BASELINE

**v0.29.0 / build 33 — VERIFIED**

User-reported result: v0.29 works correctly, including the second visual redesign pass and the shortened Undo/status snackbar timing.

Database: v12  
Backup format: v12

Verified source artifact:
`BoxInventoryAndroid_v0.29.0_AndroidStudio.zip`

Verified artifact SHA-256:
`e581dd5415eed02de970d40ea00b84d6589184db1ead022fb68bffa91c477afe`

## Latest Android checkpoint

**v0.30.0 / build 34 — IN PROGRESS / NOT USER-VERIFIED**

Checkpoint source artifact:
`BoxInventoryAndroid_v0.30.0_WIP_CrossPlatformSync_Checkpoint.zip`

Checkpoint SHA-256:
`9f4fe7f828e0ad382e07305c4b18c7f3c284514e0cffd0bb944d3a88a7287f9d`

GitHub reconstructable source patch:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP.patch`

Patch SHA-256 from the saved local checkpoint:
`0fa0211e30001985ee89e1eb0f035b9ba225f549eb3265162a0080c50ea1f9fe`

Reviewed WIP2 artifact:
`BoxInventoryAndroid_v0.30.0_WIP2_SyncSafety_Checkpoint.zip`

Reviewed WIP2 SHA-256:
`ddafd842c665300c88d39e9ccbe653fa63fe01e818ed8cf11b2da0c921d1353f`

Incremental WIP2 patch:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP2_SyncSafety.patch`

Incremental patch SHA-256:
`0ae88f2671837942cb2fdbffc25269e683beda6a99f8c23bab4daa3a77a99630`

Reviewed WIP3 artifact:
`BoxInventoryAndroid_v0.30.0_WIP3_MediaSafety_Checkpoint.zip`

Reviewed WIP3 SHA-256:
`7a2d03bfbc5d2ae2461df76ffa39f71b6182195ceb46bd80b6068b6fdddafdf1`

WIP2 → WIP3 patch:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP3_MediaSafety_from_WIP2.patch`

Local WIP3 patch SHA-256:
`c167108c9d6ecc0c35afafd0d5cb81beec9616ebff4e619458657b1c17af8785`

Reviewed WIP4 artifact:
`BoxInventoryAndroid_v0.30.0_WIP4_ForegroundSync_Checkpoint.zip`

Reviewed WIP4 SHA-256:
`b506512dcc17336a53dd30e0419ed4a7f1a7edda44b4dc07ab2530f42745ae16`

WIP3 → WIP4 patch:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP4_ForegroundSync_from_WIP3.patch`

Local WIP4 patch SHA-256:
`97083519c1235530e3da2aa1bed8e090d6ac8d4f13fc84283d29d48553f89625`

Reviewed WIP5 artifact:
`BoxInventoryAndroid_v0.30.0_WIP5_SnapshotSizeMonitor_Checkpoint.zip`

Reviewed WIP5 SHA-256:
`d9426c66a3d5050034d5781d89a689fb076e7e79617deeab976f70148c821838`

WIP4 → WIP5 patch:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP5_SnapshotSizeMonitor_from_WIP4.patch`

WIP5 code-patch SHA-256:
`4036150be735832a450e44076375fe61a05f750487d1f6ee0c9ab8e76a607517`

Current v0.30 work adds the Android side of **Inventory Sync Protocol v1** without moving, renaming, reorganizing, or rewriting the established Android application merely for cross-platform cleanliness.

Implemented in the checkpoint:

- local-first GitHub sync service;
- separate user-selected private GitHub runtime data repository;
- startup sync check after local data is ready;
- lifecycle-aware active-use periodic sync checks at about five-minute intervals;
- manual **Sync now**;
- no-op detection using local logical-data hash plus remote branch revision;
- platform-neutral snapshot JSON;
- SHA-256 content-addressed photo/media storage and deduplication;
- photo hash validation before remote data is applied;
- pre-pull Room-state preservation and automatic rollback if post-apply logical-hash reproduction fails;
- remote media-table/reference validation, strict protocol media paths, duplicate rejection, and bounded 50 MiB media downloads;
- automatic periodic checks are foreground/lifecycle-aware; lifecycle cancellation is not reported as a sync error;
- local snapshot-size monitoring with advisory thresholds at 10 MiB and 20 MiB; warnings do not block sync;
- repository, branch, and token remain user-configured and are not hard-coded;
- first-sync protection when remote data already exists;
- explicit conflict state when both local and remote inventory changed;
- explicit **Use GitHub** / **Keep this device** resolution;
- Android Keystore-backed encrypted token storage;
- shared-sync settings/status UI;
- tutorial/testing coverage for the new sync workflow.

Protocol: v1  
Snapshot schema: v1  
Room database: v12  
Local backup format: v12

v0.30 is not yet fully VERIFIED. WIP4 compiled successfully on the user's real Android toolchain, and initial Android → GitHub publish, item/media upload, and no-change lightweight-check behavior were observed successfully. WIP5 adds only the snapshot-size monitor and still requires a user compile/device check. GitHub → Android pull, conflict, and remaining protocol safety tests are still pending.

Static review result for WIP5: the new pure Kotlin snapshot-size state compiles, the edited Android files have no Kotlin parser/import-order errors in local syntax scanning, and the source contains no hard-coded runtime repository name or `github_pat_` token literal.

## Current Android task

Compile/install the reviewed v0.30 WIP5, confirm the sync card shows the snapshot size without changing the saved repository/token workflow, then continue the GitHub → Android pull test. Do not modify the Windows implementation.

## Ownership boundary

Android-specific source, build configuration, diagnostics, guided tests, candidate versions, checkpoints, APK/source archives, and verified baseline are Android-owned.

The Android worker must not implement or modify Windows source/build/project files unless the user explicitly authorizes it.
