---
'seedcord': patch
---

Fixed `seedcord codegen`, `seedcord commands` and the build crashing with a `TypeError` when your `@seedcord/gateway` or `@seedcord/http` doesn't match the CLI's release. The CLI now stops with `CliHostContractMismatch`, which you fix by updating both together.
