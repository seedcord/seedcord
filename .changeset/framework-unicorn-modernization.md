---
'seedcord': patch
'@seedcord/services': patch
'@seedcord/utils': patch
'@seedcord/plugins': patch
'@seedcord/cli': patch
---

Modernize internals via the curated eslint-plugin-unicorn rules (modern array, string, and number APIs, and `Error.isError` in error checks). Behavior-preserving, no public API change.
