---
'@seedcord/utils': minor
---

**BREAKING:** `traverseDirectory` takes only the folder now and returns files for a `for await` loop, sorted by path. A plugin that wrote `await traverseDirectory(dir, (fullPath, relativePath, imported) => {})` writes `for await (const { fullPath, relativePath, imported } of traverseDirectory(dir)) {}` instead.
