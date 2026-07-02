---
'@seedcord/eslint-config': minor
---

Replace `eslint-plugin-import` with the maintained `eslint-plugin-import-x` fork, which fixes the `import/order` autofixer crashing under eslint 10 (the original calls the removed `getTokenOrCommentBefore` API). It uses import-x's faster `resolver-next` resolver and adds `no-rename-default`. Import rule and setting names move from the `import/` namespace to `import-x/`, so update any `import/*` overrides or disable comments to `import-x/*`.

A disabled plugin now also drops its rules. Turning a plugin off (for example `registerImportPlugin: false`) previously left its rules in the config, which threw "rule not found" unless another config registered that plugin.
