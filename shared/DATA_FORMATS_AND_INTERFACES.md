# Inventory Box — Data Formats and Interfaces

## Purpose

This document is the platform-neutral contract Android and Windows use to exchange shared inventory state.

It is a runtime data contract, not a requirement to share database engines, source code, UI code, or local file paths.

## Runtime repository

Synchronization uses a separate **private GitHub repository** selected/configured by the user.

This source/coordination repository and the runtime inventory-data repository have different responsibilities.

## Inventory Sync Protocol v1

Protocol version: **1**  
Snapshot schema version: **1**

Protocol v1 is local-first, snapshot-based, content-addressed for media, and conflict-safe.

## Repository layout

```text
/inventory-sync/
  protocol.json
  current/
    snapshot.json
  media/
    <sha256>.<extension>
```

Current Android supports image extensions according to detected media type. The SHA-256 content ID, not the extension or local path, is the portable media identity.

## protocol.json

```json
{
  "product": "Inventory Box",
  "protocolVersion": 1,
  "snapshotSchemaVersion": 1
}
```

A client must refuse destructive apply when it encounters an unsupported newer protocol or snapshot schema.

## snapshot.json envelope

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

`snapshotId`, `generatedAtUtc`, and `sourceDeviceId` are envelope metadata and are not part of the canonical logical-data hash.

## Canonical logical data hash

`dataHash` is SHA-256 over a deterministic/canonical representation of these logical arrays:

- boxes
- items
- itemPhotos
- learnedRoutes
- customCategories
- categoryAliases
- moveHistory
- shoppingItems
- media

The purpose is to detect whether the logical shared inventory changed without relying on platform-local database timestamps or file paths.

### Canonical ordering for protocol v1

Before hashing or publishing a snapshot, clients must place records in these deterministic orders:

- `boxes`: ascending by `id`;
- `items`: ascending by `id`;
- `itemPhotos`: ascending by `id`;
- `learnedRoutes`: ascending by `normalizedName`;
- `customCategories`: ascending by `id`;
- `categoryAliases`: ascending by `id`;
- `moveHistory`: ascending by `id`;
- `shoppingItems`: ascending by `id`;
- `media`: ascending by lowercase `sha256`.

Within JSON objects, keys are canonicalized in ascending lexical order when calculating `dataHash`. Array order is significant, so every platform must use the ordering above rather than relying on database-return order. This ordering requirement applies to the logical arrays used for hashing and to the arrays written into `snapshot.json`.

## Boxes

Portable box fields currently include:

- id
- number
- name
- userDescription
- routingMode
- manualCategory
- qrValue
- capacityStatus
- locationName
- areaName

## Items

Portable item fields currently include:

- id
- name
- normalizedName
- category
- boxId
- note
- description
- quantity
- createdAt
- recognition/product metadata retained by the product
- crop coordinates when present
- productBarcode
- productBrand
- productDescription
- productSource
- referenceSourceUrl
- itemStatus
- statusNote
- isFavorite
- serialNumber
- modelNumber
- purchasePriceCents
- purchaseStore
- purchaseDate
- warrantyExpiration
- warrantyNote
- isArchived
- archivedAt
- mediaRefs

`mediaRefs` uses SHA-256 identifiers:

```json
{
  "primary": "<sha256-or-empty>",
  "original": "<sha256-or-empty>",
  "reference": "<sha256-or-empty>"
}
```

Platform-local file paths are never synchronized.

## Additional item photos

```json
{
  "id": "<photo-id>",
  "itemId": "<item-id>",
  "position": 0,
  "createdAt": 0,
  "mediaSha": "<sha256>"
}
```

A photo row whose backing media no longer exists locally is not published as a portable additional-photo record.

## Learned routes

Portable fields:

- normalizedName
- boxId
- updatedAt

## Custom categories

Portable fields:

- id
- name
- createdAt

## Category aliases

Portable fields:

- id
- alias
- category
- createdAt

## Move history

Portable fields:

- id
- itemId
- fromBoxId
- toBoxId
- movedAt
- reason

## Shopping items

Portable fields:

- id
- name
- normalizedName
- quantity
- note
- store
- priority
- purchased
- createdAt
- updatedAt

## Media entries

```json
{
  "sha256": "<64-lowercase-hex>",
  "relativePath": "inventory-sync/media/<sha256>.<extension>",
  "mimeType": "<mime-type>",
  "sizeBytes": 12345
}
```

The media table is deduplicated by SHA-256. Multiple item/photo references may point to the same media SHA.

Current Android protocol implementation rejects a single synchronization media file larger than 50 MiB.

## Local-only information

Do not synchronize:

- Android or Windows absolute file paths;
- theme/appearance preference;
- tutorial completion state;
- window geometry;
- last-open screen/navigation state;
- authentication tokens or API credentials;
- platform-specific build/test/checkpoint information.

## Local sync anchors

Each platform stores locally at minimum:

- configured runtime repository owner/name;
- configured branch;
- stable local device ID;
- last successful remote commit SHA;
- last successfully synchronized logical data hash;
- last successful sync time;
- current sync state/error.

Credentials remain in platform secure storage.

## Normal sync algorithm

1. Build/measure current local logical shared state.
2. Read the configured GitHub branch head commit SHA.
3. Compare local logical hash with the last successfully synchronized hash.
4. Compare remote head with the last successfully synchronized remote commit.
5. If both are unchanged, stop after the lightweight revision check; transfer no inventory/photo payload.
6. If remote changed and local did not, read/apply the current snapshot and missing media.
7. If local changed and remote did not, upload missing media and publish a new snapshot.
8. If both local and remote changed, enter **CONFLICT** and do not silently overwrite either side.
9. After success, record the new logical hash, remote commit, and success time.

## First sync

If no remote Inventory Box snapshot exists, the client may publish the current local inventory as the initial snapshot.

If a remote snapshot already exists and the client has no prior successful sync anchor, the client must require an explicit choice before replacing either side.

Protocol v1 minimum choices:

- **Use GitHub** — explicitly apply the remote shared inventory locally.
- **Keep this device** — explicitly publish the local shared inventory as current remote state.

## Upload ordering and race protection

1. Validate/create `protocol.json`.
2. Upload required missing media first.
3. Re-check the remote current snapshot before final publish.
4. If another client changed the remote snapshot during upload, stop rather than overwrite it.
5. Publish `current/snapshot.json` last.

## Download/apply safety

- Validate protocol/schema before apply.
- Validate snapshot `dataHash`.
- Download required media to staging/local imported files.
- Validate each downloaded media file by SHA-256.
- Only then replace/reconcile local logical records to the remote snapshot.
- A client must not leave a failed remote apply as the active local inventory. If post-apply canonical/hash verification fails, preserve or restore the pre-pull local records before reporting the sync failure.

## Permanent deletion

Protocol v1 snapshot represents complete current logical state.

Permanent deletion removes the record from a newly published snapshot. A client applying a remote snapshot must reconcile to the snapshot rather than only append records.

Archived records remain represented until permanently deleted.

## Startup and periodic checks

Both platforms should check for remote changes at startup after local data is available.

Foreground/active-use periodic checks may run every few minutes when practical.

Exact scheduling is platform-specific. Android background scheduling remains subject to Android OS scheduling limits.

## Conflict policy

Protocol v1 favors data safety over automatic field-level merging.

If local and remote both changed since the last successful common anchor:

- status becomes CONFLICT;
- no silent overwrite occurs;
- the user explicitly chooses which shared state becomes authoritative.

A future protocol revision may add record/field-level merge only after both platforms implement the same rules and tests.

## Security

- Runtime data repository should be private.
- Tokens/credentials must never appear in shared JSON or committed source.
- Each platform is responsible for secure local credential storage.
