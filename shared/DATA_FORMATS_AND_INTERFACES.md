# Inventory Box — Data Formats and Interfaces

## Purpose

This document defines the platform-neutral contract Android and Windows use to exchange inventory state.

This is a **runtime data contract**, not a requirement to share database engines or source code.

## Runtime repository

Use a separate **private GitHub repository** selected/configured by the user.

The source/coordination repository and runtime inventory-data repository are different responsibilities.

## Sync protocol version

Initial contract: **Inventory Sync Protocol v1**

Protocol v1 is local-first and snapshot-based with media deduplication and conflict protection.

## Repository layout

```text
/inventory-sync/
  protocol.json
  current/
    snapshot.json
  media/
    <sha256>.jpg
```

Future versions may add history/change-batch directories without invalidating v1 readers.

## protocol.json

Minimum fields:

```json
{
  "product": "Inventory Box",
  "protocolVersion": 1,
  "snapshotSchemaVersion": 1
}
```

## snapshot.json

The snapshot contains platform-neutral logical data only.

Minimum envelope:

```json
{
  "product": "Inventory Box",
  "protocolVersion": 1,
  "snapshotSchemaVersion": 1,
  "snapshotId": "<uuid>",
  "generatedAtUtc": "<ISO-8601>",
  "sourceDeviceId": "<stable-random-device-id>",
  "dataHash": "<sha256-of-canonical-logical-data>",
  "boxes": [],
  "items": [],
  "itemPhotos": [],
  "learnedRoutes": [],
  "customCategories": [],
  "categoryAliases": [],
  "moveHistory": [],
  "shoppingItems": [],
  "media": []
}
```

## Portable IDs

Existing stable record IDs must be preserved.

Do not use local file paths as IDs.

## Photos/media

Every shared image is represented by a SHA-256 content identifier.

Example media entry:

```json
{
  "sha256": "<64-hex>",
  "relativePath": "inventory-sync/media/<sha256>.jpg",
  "mimeType": "image/jpeg",
  "role": "PRIMARY",
  "itemId": "<item-uuid>",
  "photoId": "<optional-photo-uuid>"
}
```

Recommended roles:

- PRIMARY
- ORIGINAL
- REFERENCE
- ADDITIONAL

A platform maps the media SHA to its own local file path after download.

A media blob already present remotely by SHA-256 is not uploaded again.

For GitHub practicality, clients may create a normalized synchronization copy of very large photos while preserving the local original. If used, this behavior must be documented consistently by both platforms.

## Local-only fields

Do not synchronize:

- Android/Windows absolute file paths
- theme/appearance preference
- tutorial completion state
- window geometry
- last-open screen
- authentication tokens
- platform-specific build/test state

## Sync state stored locally per platform

Each client stores at minimum:

- configured repository owner/name
- configured branch
- stable local device ID
- last successful remote commit SHA
- last successfully synchronized data hash
- local dirty/pending state
- last successful sync time
- current sync status/error

Secrets such as GitHub tokens remain in platform secure storage and never appear in snapshot.json.

## Normal sync algorithm

1. Read local sync configuration.
2. Fetch the configured branch's current remote commit SHA.
3. Compare it to the client's last successful remote commit SHA.
4. Check whether local shared data is dirty/changed.
5. If remote unchanged AND local unchanged: stop; no payload upload/download.
6. If remote changed AND local unchanged: download/apply the current snapshot and missing media.
7. If remote unchanged AND local changed: build snapshot, upload missing media, then upload snapshot last.
8. If remote changed AND local changed: enter CONFLICT; do not silently overwrite either side.
9. On success, record the new remote commit SHA/data hash and clear local pending state.

## Upload ordering

Upload missing media first.

Upload `current/snapshot.json` last.

This ensures a published snapshot never intentionally references media that the same sync has not yet attempted to publish.

## Startup sync

Both platforms should perform a sync check at startup after local data is available.

The UI should not need to block on sync before showing existing local inventory.

## Periodic sync

Foreground/active-use checks may run every few minutes when practical.

Android background scheduling is subject to Android OS scheduling limits and should use platform-supported background work rather than pretending exact few-minute wakeups are guaranteed.

Windows may use a different background/foreground schedule.

## Conflict behavior — protocol v1

Protocol v1 prioritizes data safety over silent automatic merging.

If the remote commit changed since the client's last successful sync AND the local shared inventory also changed:

- status becomes CONFLICT;
- neither side is overwritten automatically;
- user-facing resolution must preserve an opportunity to keep/backup either side.

Minimum safe choices when implemented:

- Use GitHub version (discard local unsynced shared changes after explicit confirmation)
- Keep this device version (replace remote current snapshot after explicit confirmation)

A future protocol may add record/field-level merge after both platforms implement the same rules and tests.

## Deletion

Snapshot v1 represents the complete current logical state, including archived records.

Permanent deletion removes the record from a newly published snapshot. A client applying a remote snapshot must therefore reconcile to the snapshot rather than only append records.

## Compatibility

A client must refuse destructive apply when it encounters an unsupported newer `protocolVersion` or `snapshotSchemaVersion`.

It should report the incompatibility rather than guessing.

## Repository API expectations

The clients may use GitHub REST APIs to:

- read the branch/repository revision;
- read `protocol.json` and `current/snapshot.json`;
- check for a media blob by path;
- upload missing media;
- update the current snapshot.

Exact HTTP/library implementation is platform-specific.
