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

Bump peer floor: TypeScript ^6.0.3, Node ^22.13. Consumers on TypeScript 5.x or Node 22.12 will need to upgrade.

Shared `packages/tsconfig/base.json` flipped `esModuleInterop` to `true` and added `"types": ["node"]` to satisfy TypeScript 6's removed-implicit-defaults requirements. No public API surface changes.
