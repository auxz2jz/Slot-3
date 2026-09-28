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
