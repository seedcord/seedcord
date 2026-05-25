---
'@seedcord/docs-generator': patch
'@seedcord/docs-engine': patch
---

Bump `typedoc` 0.28.15 → 0.28.19 and its plugins `typedoc-plugin-dt-links` ^2.0.34 → ^2.0.56 and `typedoc-plugin-mdn-links` ^5.0.10 → ^5.1.1 in lockstep. 0.28.18 adds TypeScript 6 support (clears the prior peer warning); 0.28.19 ships translations + comment-slash normalization. `pnpm docs:smoke` output is bit-identical to baseline.
