<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />
    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />
  </picture>
</div>

# @seedcord/docs-engine

Reads the API model JSON that `@seedcord/docs-generator` writes and produces what `apps/docs` renders.

The root entry imports `node:*` and api-extractor-model. `@seedcord/docs-engine/client` is the subset a client component can import, since a `node:*` import reachable from a client bundle breaks `next build`.
