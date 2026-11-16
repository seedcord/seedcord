<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://cdn.seedcord.org/assets/wordmark-dark.webp" />
    <img src="https://cdn.seedcord.org/assets/wordmark-light.webp" alt="seedcord" width="440" />
  </picture>
</div>

# @seedcord/plugin-utils

A private package for the code that the first-party plugins share. Each plugin that uses it bundles it through `alwaysBundle` in its `vite.config.ts`.

Add code here when two or more first-party plugins share it and plugin authors don't need it. Put anything that every plugin author would want on `@seedcord/core/plugin`.
