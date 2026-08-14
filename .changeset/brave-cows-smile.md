---
'@seedcord/eslint-config': patch
---

_Kinda BREAKING?:_ `eslint-plugin-mdx`, `eslint-plugin-better-tailwindcss`, and `eslint-plugin-tailwind-canonical-classes` are optional peer dependencies now, so a project that skips `tailwindEntryPoint` and `mdxFiles` stops downloading them. Install the ones you use.
