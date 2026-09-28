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

Current v0.30 work adds the Android side of **Inventory Sync Protocol v1** without moving, renaming, reorganizing, or rewriting the established Android application merely for cross-platform cleanliness.

Implemented in the checkpoint:

- local-first GitHub sync service;
- separate user-selected private GitHub runtime data repository;
- startup sync check;
- periodic active-use checks at about five-minute intervals;
- manual **Sync now**;
- no-op detection using local logical-data hash plus remote branch revision;
- platform-neutral snapshot JSON;
- SHA-256 content-addressed photo/media storage and deduplication;
- photo hash validation before remote data is applied;
- pre-pull Room-state preservation and automatic rollback if post-apply logical-hash reproduction fails;
- remote media-table/reference validation, strict protocol media paths, duplicate rejection, and bounded 50 MiB media downloads;
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

This checkpoint is not VERIFIED until the user builds/tests it.

Static review result: the complete new sync package passes Kotlin type/signature compilation against local Android/data interface stubs. Full Gradle/APK build remains pending because the review environment lacks the Gradle 9.1/Android dependency cache and cannot download it.

## Current Android task

Build the reviewed v0.30 WIP3 with a real Android Gradle toolchain, fix only evidence-based build issues if any, and present the resulting Android candidate for testing. Do not modify the Windows implementation.

## Ownership boundary

Android-specific source, build configuration, diagnostics, guided tests, candidate versions, checkpoints, APK/source archives, and verified baseline are Android-owned.

The Android worker must not implement or modify Windows source/build/project files unless the user explicitly authorizes it.
