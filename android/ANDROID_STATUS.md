# Android Inventory Box — Platform Status

Ownership: **Android chat/workflow**

Do not use this file to record Windows implementation status.

## ANDROID LAST VERIFIED BASELINE

**v0.28.0 / build 32**

User-reported result: Box Audit works correctly; existing tested behavior works. The user reported the Undo/status snackbar stayed visible too long.

Database: v12  
Backup format: v12

Verified source artifact recorded in the Android development workflow:
`BoxInventoryAndroid_v0.28.0_AndroidStudio.zip`

## Latest Android candidate

**v0.29.0 / build 33 — CANDIDATE / not yet user-verified in this record**

Changes:
- shorter Undo timing (Material Long, approximately 10 seconds subject to accessibility timing);
- visual redesign pass 2.

Database: v12  
Backup format: v12

Candidate source artifact:
`BoxInventoryAndroid_v0.29.0_AndroidStudio.zip`

## Current Android task

Add the cross-platform GitHub inventory synchronization feature without reorganizing or rewriting the established Android application.

Use the existing Android structure. Shared behavior is defined under `shared/`.

## Ownership boundary

Android-specific source, build configuration, diagnostics, guided tests, candidate versions, APK/source archives, checkpoints, and verified baseline are Android-owned.

The Android worker must not implement or modify Windows source/build files.
