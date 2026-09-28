# Inventory Box — Shared Product Vision

## Product purpose

Inventory Box helps a user record, organize, locate, audit, and maintain physical belongings stored in boxes and other storage locations.

The product should remain usable as a local inventory application even when network sync is unavailable.

## Cross-platform model

Inventory Box is one product with two separate platform implementations:

- Android Inventory Box
- Windows Inventory Box

The platforms should share product intent, terminology, interoperable data, and synchronization behavior where applicable. They do not need identical UI code, libraries, source structure, or technical architecture.

## Core experience

The user should be able to:

- add one or many inventory items;
- attach identifying photos;
- assign items to physical boxes;
- use categories and custom categories;
- search and filter the inventory;
- scan/open boxes by QR where the platform supports it;
- track quantity, favorites, status, model/serial information, purchase/warranty information, and notes;
- move items between boxes;
- audit a physical box against the recorded inventory;
- archive and restore items;
- maintain a shopping list;
- print/share inventory information where supported;
- back up and restore data;
- synchronize the shared inventory between Android and Windows.

## Shared terminology

- **Item** — one inventory record representing a physical object or a quantity of the same object.
- **Box** — a physical storage container with a stable ID/QR identity.
- **Location** — higher-level storage place such as Garage or Shed.
- **Shelf / area** — optional level between Location and Box.
- **Archive** — removes an item from active inventory while preserving a recoverable record.
- **Missing** — item is expected in inventory but cannot currently be located.
- **Loaned out** — item remains owned/recorded but is temporarily outside its storage box.
- **Audit** — physically compare a box's recorded contents with what is actually present.
- **Sync** — exchange shared inventory state between a local platform database and the configured private GitHub data repository.
