---
'@seedcord/eslint-config': major
---

**BREAKING:** `registerImportPlugin` takes `'all' | 'fast' | 'off'` in place of a boolean. `'fast'` skips `no-cycle` and `no-deprecated`. `IMPORT_RULES` is no longer exported.
