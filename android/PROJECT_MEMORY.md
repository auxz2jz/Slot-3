# Android Inventory Box — Project Memory

Read this before making Android changes.

## Mandatory master instructions

Read in this order:

1. `auxz2jz/master-instruction-library/INSTRUCTION_INDEX.md`
2. `CORE_DEVELOPMENT_RECOVERY_RULES.md`
3. `DIAGNOSTICS_STANDARD.md`
4. `GUIDED_TESTING_STANDARD.md`
5. `CROSS_PLATFORM_COLLABORATION_STANDARD.md`
6. this repository's `shared/` coordination files
7. this Android project memory/status/roadmap

## Product/platform model

Inventory Box is **one product with two separate platform implementations**:

- Android Inventory Box — owned by Android chat/workflow
- Windows Inventory Box — owned by PC/Codex agent

Share product intent, common behavior, common data formats, and interoperability contracts. Do not require shared source code, UI code, libraries, or architecture.

Do not reorganize, move, rename, or rewrite the established Android project merely to create a cleaner cross-platform layout.

## Android last verified baseline

**v0.29.0 / build 33 — VERIFIED**

Artifact:
`BoxInventoryAndroid_v0.29.0_AndroidStudio.zip`

SHA-256:
`e581dd5415eed02de970d40ea00b84d6589184db1ead022fb68bffa91c477afe`

Database / local backup: v12 / v12.

## Current Android checkpoint

**v0.30.0 / build 34 — IN PROGRESS / NOT VERIFIED**

Checkpoint artifact:
`BoxInventoryAndroid_v0.30.0_WIP_CrossPlatformSync_Checkpoint.zip`

SHA-256:
`9f4fe7f828e0ad382e07305c4b18c7f3c284514e0cffd0bb944d3a88a7287f9d`

Purpose: implement the Android side of shared Android/Windows inventory synchronization through a user-configured private GitHub runtime data repository.

Changed/added Android source in the checkpoint includes:

- `app/src/main/java/com/aiboxinventory/app/sync/InventorySyncService.kt`
- `app/src/main/java/com/aiboxinventory/app/sync/GitHubSyncClient.kt`
- `app/src/main/java/com/aiboxinventory/app/sync/SecureTokenStore.kt`
- `app/src/main/java/com/aiboxinventory/app/sync/SyncState.kt`
- `app/src/main/java/com/aiboxinventory/app/AIBoxApplication.kt`
- `app/src/main/java/com/aiboxinventory/app/ui/AppViewModel.kt`
- `app/src/main/java/com/aiboxinventory/app/ui/AIBoxRoot.kt`
- `app/build.gradle.kts`
- `V0_30_NOTES.md`

## Sync design checkpoint

- Android remains local-first.
- The Android SQLite/Room database file is never uploaded as the shared database.
- Runtime sync uses a separate private GitHub data repository chosen by the user.
- Protocol v1 is snapshot-based with content-addressed media.
- `inventory-sync/protocol.json`
- `inventory-sync/current/snapshot.json`
- `inventory-sync/media/<sha256>.<extension>`
- No-change checks stop after a lightweight remote revision check.
- Media already present by SHA-256 is not uploaded again.
- Remote photos are SHA-256 validated before apply.
- If both local and remote logical state changed, sync enters CONFLICT and performs no silent overwrite.
- Protocol v1 resolves conflict only through an explicit source choice; field-level automatic merge is deferred.
- GitHub credentials stay platform-local and are never part of shared JSON.

## Testing rule

Every new user-facing feature requires tutorial/testing guidance.

For v0.30 test at minimum:

- configure repository, branch, and token;
- initial publish to an empty runtime data repository;
- initial sync when a remote snapshot already exists;
- Android push and second-client pull;
- second-client change and Android pull;
- no-change sync transfers no inventory/photo payload;
- simultaneous local+remote changes produce conflict without overwrite;
- photos round-trip correctly;
- unsupported newer protocol/schema is refused;
- token never appears in shared data/export.

## Recovery

If work becomes confused, recover from verified v0.29. The v0.30 tree is only an in-progress checkpoint until the user explicitly verifies it.
