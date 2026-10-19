---
'@seedcord/utils': minor
---

**BREAKING:** `importFiles` takes only the folder now and returns files for a `for await` loop, sorted by path. A plugin that wrote `await importFiles(dir, (fullPath, relativePath, imported) => {})` writes `for await (const { fullPath, relativePath, imported } of importFiles(dir)) {}` instead.
