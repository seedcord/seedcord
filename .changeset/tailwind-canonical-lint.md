---
'@seedcord/eslint-config': minor
---

new opt-in tailwind canonical-class autofix lint. pass `tailwindEntryPoint` to `createConfig` to enable; off otherwise. autofixes shorthand combining (`h-N w-N` → `size-N`), arbitrary-value normalization, and v4 modifier position. also exports `resolveSharedTailwindEntry` for shared packages without their own `globals.css`. `tailwindcss` is now an optional peer.
