---
'@seedcord/eslint-config': minor
---

Support eslint 10. `eslint` moves from `dependencies` to `peerDependencies` at `^9.39.4 || ^10.6.0`, so consumers stay on eslint 9 or move to 10 as they choose. Consumers still on `eslint-plugin-react` (which breaks on eslint 10) can pin eslint 9 without conflict.
