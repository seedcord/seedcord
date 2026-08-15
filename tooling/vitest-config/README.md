<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />
    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />
  </picture>
</div>

# @seedcord/vitest-config

Internal vitest preset. `createVitestConfig(import.meta.url, overrides?)` merges the workspace test defaults, aliases derived from the sibling `tsconfig.json` `paths`, and the package's overrides. `aliasFromTsconfig(import.meta.url)` returns the derived alias map alone.
