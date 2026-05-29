---
'@seedcord/eslint-config': patch
'@seedcord/cli': patch
'@seedcord/plugins': patch
'@seedcord/services': patch
'@seedcord/types': patch
'@seedcord/utils': patch
'@seedcord/docs-engine': patch
'@seedcord/docs-generator': patch
'seedcord': patch
---

bump peer floor: typescript `^6.0.3`, node `^22.13`. shared `tsconfig/base.json` now sets `esModuleInterop: true` and `types: ["node"]` for ts6's removed implicit defaults. no public API changes.
