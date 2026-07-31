---
'@seedcord/gateway': patch
'@seedcord/utils': patch
'seedcord': patch
---

Modernize internals via the curated eslint-plugin-unicorn rules (modern array, string, and number APIs, and `Error.isError` in error checks). Behavior-preserving, no public API change.
