# Inventory Box — Shared Decisions

## D-001 — One product, separate platform implementations
Android and Windows are separate implementations. No requirement exists to share source code, UI code, libraries, or build systems.

## D-002 — Preserve the established Android application
The working Android implementation will not be reorganized, moved, renamed, or rewritten merely to create a cleaner cross-platform repository layout.

## D-003 — Separate platform ownership
Android work owns Android implementation files. PC/Codex owns Windows implementation files. Cross-platform communication occurs through shared product documentation/contracts.

## D-004 — Separate verified baselines
Android verification never verifies Windows, and Windows verification never verifies Android.

## D-005 — Separate runtime data repository
The runtime GitHub repository used for synchronized inventory/photos should be a user-selected private data repository, separate from this source/coordination repository.

## D-006 — Local-first operation
Each platform keeps a complete local working database and remains usable offline. GitHub synchronization is an interoperability layer, not the live database engine.

## D-007 — Sync only when needed
A periodic sync first checks remote revision and local dirty state. If neither changed, no inventory/photo payload is transferred.

## D-008 — Conflict protection before automatic merging
Initial cross-platform sync must detect simultaneous unsynchronized local and remote changes and avoid silent overwrite. More granular automatic merging may be added later after both implementations share test coverage.
