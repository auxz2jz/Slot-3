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

## Current Android task

Resume from the v0.30 checkpoint, validate/build the Android candidate, and present it for Android testing. Do not modify the Windows implementation.

## Ownership boundary

Android-specific source, build configuration, diagnostics, guided tests, candidate versions, checkpoints, APK/source archives, and verified baseline are Android-owned.

The Android worker must not implement or modify Windows source/build/project files unless the user explicitly authorizes it.
