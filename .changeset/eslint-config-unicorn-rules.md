---
'@seedcord/eslint-config': minor
---

Add a curated set of eslint-plugin-unicorn rules (correctness, modern APIs, clarity), on by default via the new `registerUnicornPlugin` option. Consumers on eslint 9 must set `registerUnicornPlugin: false`, because unicorn requires eslint >=10.4.
