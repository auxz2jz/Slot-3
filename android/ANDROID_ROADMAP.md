# Android Inventory Box — Android Roadmap

Ownership: **Android chat/workflow**

This file contains Android implementation work only. Shared product intent lives in `shared/`.

## Verified baseline

- v0.29.0 / build 33 — VERIFIED

## Current work

### v0.30.0 — Shared inventory synchronization

Status: **IN PROGRESS / NOT VERIFIED**

Shared feature references:

- F-017 Shared inventory synchronization
- F-018 Sync status and manual control
- F-019 No-op sync detection
- F-020 Startup and periodic sync
- F-021 Cross-platform conflict protection

Android implementation goals:

1. preserve the established Android local database and workflows;
2. use a separate private GitHub runtime data repository;
3. implement Inventory Sync Protocol v1;
4. avoid unnecessary payload transfers;
5. protect against silent concurrent overwrite;
6. keep authentication secret and Android-local;
7. expose clear sync status and manual control;
8. provide tutorial/testing guidance;
9. build and test without modifying Windows-owned source;
10. monitor snapshot growth locally and warn at 10 MiB / 20 MiB without hard-coding repository credentials or changing protocol v1.

## Next steps

1. Compile/install the reviewed v0.30 WIP5 snapshot-size-monitor checkpoint.
2. Confirm the sync card reports snapshot size and the saved repository/token workflow is unchanged.
3. Continue the controlled GitHub → Android pull test.
4. Test deliberate local+remote conflict protection and remote media round-trip.
5. Fix only evidence-based Android issues.
6. Keep v0.29 protected until v0.30 is explicitly verified.
7. PC/Codex independently implements the Windows side from `shared/`.
8. Perform end-to-end Android ↔ GitHub ↔ Windows tests after a Windows candidate exists.

## Deferred shared evolution

Field/record-level automatic merge may be considered in a future shared protocol revision only after both platforms implement the same merge rules and tests.
