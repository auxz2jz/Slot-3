# Inventory Box — Shared Requirements

## Product behavior

1. Android and Windows are separate implementations of the same product.
2. Shared behavior should be consistent where practical, but platform-native UI/architecture is allowed.
3. Physical storage state must not be changed merely because software suggested a move. User confirmation is required.
4. Archive is recoverable removal from active inventory; permanent delete is distinct.
5. An audit must not automatically mark an unchecked item Missing without confirmation.
6. Stable IDs must be preserved across platforms for boxes, items, photos, categories, moves, and shopping records where the record has an ID.
7. Platform-specific local file paths must never be treated as cross-platform identifiers.

## Cross-platform data

1. Shared data must use platform-neutral JSON/file semantics.
2. Photos must be referenced by portable media identifiers, not Android or Windows paths.
3. Runtime sync credentials are platform-local secrets and must never be committed to source/shared documentation.
4. Device preferences such as theme, tutorial completion, window size, camera settings, and last-open screen remain local unless explicitly promoted to shared product data.
5. The runtime inventory-data repository should be private.
6. Sync must avoid unnecessary payload transfer when neither local nor remote state changed.
7. Remote changes must be pulled before a local push decision.
8. Concurrent local+remote changes must not be silently overwritten.

## Platform ownership

- Android source/build/tests/diagnostics/checkpoints/artifacts are Android-owned.
- Windows source/build/tests/diagnostics/checkpoints/artifacts are Windows-owned.
- Shared files contain product-neutral intent/contracts only.
- One platform must never mark the other platform VERIFIED.

## Diagnostics and testing

Each platform independently follows the Master Diagnostics Standard and Guided Testing Standard. Cross-platform features should test the same intended behavior using platform-appropriate steps.
