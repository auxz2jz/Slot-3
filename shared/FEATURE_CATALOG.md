# Inventory Box — Shared Feature Catalog

Stable feature IDs identify product behavior across platforms. Platform implementations may differ.

## Core inventory

**F-001 — Inventory item records**  
Store item name, description, quantity, category, notes, identifiers, status, timestamps, and box assignment.

**F-002 — Item photos**  
Support a primary identifying photo and additional photos/angles.

**F-003 — Physical boxes and stable box identity**  
Boxes have stable IDs and may have QR values/labels.

**F-004 — Categories and learned routing**  
Support built-in/custom categories and learned item-to-category/box routing where appropriate.

**F-005 — Quantity and duplicate handling**  
Allow quantity and detection/handling of likely duplicate entries.

**F-006 — Search and filters**  
Search by item data and use structured filters. Voice input is platform-optional.

**F-007 — Item state and importance**  
Support In box, Loaned out, Missing, Favorites, Archive, Restore, and explicit permanent delete.

**F-008 — Storage hierarchy**  
Support optional Location → Shelf/area → Box organization.

**F-009 — Move history and reorganization**  
Track physical moves and provide reorganization assistance without pretending a physical move occurred before user confirmation.

**F-010 — Shopping list**  
Maintain planned purchases and indicate when inventory may already contain the item.

**F-011 — Box contents reports**  
Produce shareable/printable box contents information with identifying photos where practical.

**F-012 — Purchase and warranty information**  
Optional purchase price, store/seller, purchase date, warranty expiration, and warranty note.

**F-013 — Box audit**  
Compare expected contents with physical contents; not-found items require explicit confirmation before becoming Missing.

**F-014 — Backup and restore**  
Provide a recoverable local backup/export format.

**F-015 — Guided feature tutorials/testing**  
Every important user-facing feature should have a user-understandable test/tutorial on platforms where practical.

**F-016 — Diagnostics**  
Important actions/background operations should provide structured diagnostic evidence according to the Master Diagnostics Standard.

## Cross-platform

**F-017 — Shared inventory synchronization**  
Android and Windows synchronize platform-neutral inventory data and photos through a user-configured private GitHub data repository.

**F-018 — Sync status and manual control**  
Show sync state such as Unconfigured, Synced, Pending, Syncing, Conflict, and Error; provide Sync now.

**F-019 — No-op sync detection**  
If local data is unchanged and the remote revision is unchanged, perform only the lightweight remote revision check and transfer no inventory/photo payload.

**F-020 — Startup and periodic sync**  
Check for remote updates at application startup and periodically while the application is in active use. Platform background scheduling may differ.

**F-021 — Cross-platform conflict protection**  
Never silently overwrite concurrent unsynchronized changes from another platform. Detect conflicts and require safe resolution.

## Platform-status rule

Shared catalog entries describe product intent only. Each platform must track its own status independently as APPLICABLE / PLANNED / IMPLEMENTED / VERIFIED / NOT APPLICABLE / BLOCKED / DEFERRED.
