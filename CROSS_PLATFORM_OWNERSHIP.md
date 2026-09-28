# Inventory Box Cross-Platform Ownership

Inventory Box is **one product with two separate active platform implementations**:

- Android Inventory Box — owned by the Android chat/workflow.
- Windows Inventory Box — owned by the PC/Codex workflow.

This repository also contains a **legacy web implementation** at the repository root. It is historical/reference material and is not the active Android or Windows implementation.

## Existing root files

### Legacy web implementation — do not treat as shared product files
- `app.js`
- `index.html`
- `styles.css`
- `crop-mobile-fix.css`
- `enhanced-ai.js`

These files describe/implement the older browser version. Do not refactor, move, delete, or reuse them as Windows or Android source without explicit user approval.

### Android-owned historical planning
- `ANDROID_ARCHITECTURE.md`

This is an older Android migration/design document. It is Android-specific and may be outdated relative to the current native Android app. Do not treat it as a shared cross-platform specification.

### Repository-level infrastructure
- `.gitignore`

Repository-wide infrastructure changes require care because they may affect both platform workspaces.

### Existing `README.md`
The current root README is web-version-specific. It is not the cross-platform shared product source of truth. Shared product intent is recorded under `shared/`.

## Active ownership zones

### Shared product information
`shared/`

May be updated by either platform worker only after reading the latest version and preserving unrelated content.

### Android-owned
`android/` for Android-specific project status/documentation.

The existing native Android source remains in its current working structure/artifact workflow. **Do not move or rewrite the working Android application solely to fit this repository layout.**

### Windows-owned
`windows/`

Reserved for the PC/Codex agent. Android work must not modify Windows source, Windows project/build files, Windows checkpoints, Windows diagnostics, Windows tests, Windows artifacts, or Windows verified baseline.

## Baseline rule

Maintain separately:

- **ANDROID LAST VERIFIED BASELINE**
- **WINDOWS LAST VERIFIED BASELINE**

Testing one platform does not verify the other.

## Runtime sync repository

The GitHub repository used at runtime to synchronize inventory data/photos should be a **separate private data repository** chosen by the user. It is not automatically this source/coordination repository.

See `shared/DATA_FORMATS_AND_INTERFACES.md`.
