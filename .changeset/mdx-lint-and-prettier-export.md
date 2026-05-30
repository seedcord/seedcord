---
'@seedcord/eslint-config': minor
---

new opt-in mdx lint. pass `mdxFiles` (e.g. `['**/*.mdx']`) to `createConfig` to register the `eslint-mdx` parser + `mdx` plugin and run core `no-unused-expressions` on embedded js/jsx; omit to disable, same as `tailwindEntryPoint`. no `mdx/remark` prose bridge, markdownlint already covers that. also adds a separate `@seedcord/eslint-config/prettier` export with `createPrettierConfig({ tailwind })` that layers in `prettier-plugin-tailwindcss` (now an optional peer); class sorting defaults to the `cn`/`tw` helpers with no attribute scanning, and the eslint `tailwindCalleeFunctions` default is narrowed to `['cn']` to match.
