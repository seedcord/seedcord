# @seedcord/vitest-config

Internal vitest preset. `createVitestConfig(import.meta.url, overrides?)` merges the workspace test defaults, aliases derived from the sibling `tsconfig.json` `paths`, and the package's overrides. `aliasFromTsconfig(import.meta.url)` returns the derived alias map alone.
