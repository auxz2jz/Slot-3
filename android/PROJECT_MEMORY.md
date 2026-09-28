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

Reconstructable GitHub patch:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP.patch`

Patch SHA-256:
`0fa0211e30001985ee89e1eb0f035b9ba225f549eb3265162a0080c50ea1f9fe`

Reviewed WIP2 checkpoint artifact:
`BoxInventoryAndroid_v0.30.0_WIP2_SyncSafety_Checkpoint.zip`

Reviewed WIP2 SHA-256:
`ddafd842c665300c88d39e9ccbe653fa63fe01e818ed8cf11b2da0c921d1353f`

Incremental GitHub patch from the original v0.30 handoff:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP2_SyncSafety.patch`

Incremental patch SHA-256:
`0ae88f2671837942cb2fdbffc25269e683beda6a99f8c23bab4daa3a77a99630`

WIP2 review result:
- added pre-pull Room-state preservation and automatic rollback if post-apply logical-hash reproduction fails;
- shared protocol now defines exact canonical array ordering for Android/Windows hashes;
- the complete sync package passes Kotlin type/signature compilation against local Android/data interface stubs;
- full Gradle/APK build remains pending because the review environment lacks the Gradle 9.1/Android dependency cache and cannot download it.

Shared protocol hardening commits:
- `e64607b2636acb60cae7e7dc3370fa9dac53167d` — canonical array ordering and failed-pull safety requirement;
- `8b009958890cef93afe84f4f056158d9c51c0489` — explicit protocol-v1 field/scalar types for cross-platform hash parity.
- `d2fdaa6598dcc6688df620db6ab44f197ea9f9b2` — require declared, bounded, valid media entries and references.

Current reviewed WIP3 checkpoint:
`BoxInventoryAndroid_v0.30.0_WIP3_MediaSafety_Checkpoint.zip`

WIP3 SHA-256:
`7a2d03bfbc5d2ae2461df76ffa39f71b6182195ceb46bd80b6068b6fdddafdf1`

WIP2 → WIP3 recovery patch:
`android/checkpoints/BoxInventoryAndroid_v0.30.0_WIP3_MediaSafety_from_WIP2.patch`

Local patch SHA-256:
`c167108c9d6ecc0c35afafd0d5cb81beec9616ebff4e619458657b1c17af8785`

WIP3 additionally rejects malformed/undeclared/duplicate/oversized remote media, bounds media downloads to 50 MiB, and preserves declared media extensions. The complete sync package still passes Kotlin type/signature compilation against local Android/data interface stubs.

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
