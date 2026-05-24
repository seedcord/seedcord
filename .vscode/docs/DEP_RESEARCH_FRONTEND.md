# Frontend Dependency Research

Research date: 2026-05-24
Scope: `apps/docs` (Next.js App Router) and forthcoming frontend apps.
Policy: chase latest stable unless an active security advisory blocks it. All packages below were checked against the npm registry on the research date; none of them have an open advisory that would block adopting the listed latest version.

## Version Matrix

| Package                       | Current (seedcord) | Latest stable | Cancrops pin | Delta              | Risk       |
| ----------------------------- | ------------------ | ------------- | ------------ | ------------------ | ---------- |
| next                          | ^16.1.0            | 16.2.6        | -            | minor patch        | low        |
| react                         | 19.2.3 (catalog)   | 19.2.6        | 19.2.6       | patch              | low        |
| react-dom                     | ^19.2.3            | 19.2.6        | 19.2.6       | patch              | low        |
| @types/react                  | 19.2.7 (catalog)   | 19.2.15       | 19.2.14      | patch              | low        |
| @types/react-dom              | ^19.2.3            | 19.2.3        | 19.2.3       | none               | n/a        |
| eslint-config-next            | ^16.1.0            | 16.2.6        | -            | minor              | low        |
| @radix-ui/react-dialog        | ^1.1.15            | 1.1.15        | -            | none               | n/a        |
| @radix-ui/react-dropdown-menu | ^2.1.16            | 2.1.16        | -            | none               | n/a        |
| @radix-ui/react-popover       | ^1.1.15            | 1.1.15        | -            | none               | n/a        |
| @radix-ui/react-slot          | ^1.2.4             | 1.2.4         | -            | none               | n/a        |
| @radix-ui/react-tooltip       | ^1.2.8             | 1.2.8         | -            | none               | n/a        |
| tailwindcss                   | ^4.1.18            | 4.3.0         | 4.3.0        | minor              | low        |
| @tailwindcss/postcss          | ^4.1.18            | 4.3.0         | -            | minor              | low        |
| @tailwindcss/vite             | n/a                | 4.3.0         | 4.3.0        | n/a                | n/a        |
| prettier-plugin-tailwindcss   | ^0.7.2             | 0.8.0         | 0.8.0        | minor              | low        |
| clsx                          | ^2.1.1             | 2.1.1         | -            | none               | n/a        |
| tailwind-merge                | ^3.4.0             | 3.6.0         | -            | minor              | low        |
| cmdk                          | ^1.1.1             | 1.1.1         | -            | none               | n/a        |
| lucide-react                  | ^0.562.0           | 1.16.0        | 1.16.0       | **major (0->1)**   | **medium** |
| next-themes                   | ^0.4.6             | 0.4.6         | -            | none               | n/a        |
| marked                        | ^17.0.1            | 18.0.4        | -            | **major (17->18)** | low        |
| postcss                       | ^8.5.6             | 8.5.15        | -            | patch              | low        |
| shiki                         | ^3.20.0            | 4.1.0         | -            | **major (3->4)**   | medium     |
| zustand                       | ^5.0.9             | 5.0.13        | -            | patch              | low        |

---

## Per-package detail

### next: ^16.1.0 -> 16.2.6

- **Status:** safe minor/patch bump. No Next 17 has shipped; only 16.x.canary tags exist on GitHub.
- **Breaking changes since 16.1:** none in stable. 16.x already introduced async `params`/`searchParams`, `proxy.ts` (replaces `middleware.ts`), Turbopack default, removal of `next lint`, removal of `serverRuntimeConfig`/`publicRuntimeConfig`, removal of `experimental.dynamicIO` (renamed to `cacheComponents`), parallel routes requiring explicit `default.js`, and `revalidateTag()` now requiring a `cacheLife` profile as its second argument. Seedcord adopted 16.1, so these are already accounted for.
- **Seedcord file check:** `apps/docs/src/app/docs/packages/[packageId]/[versionId]/[[...entitySegments]]/page.tsx` already destructures `params` as `Promise<PageParams>` and awaits it (line "async function PackageEntityPage({ params }: { params: Promise<PageParams> }"). No migration needed.
- **Other things to verify (not blocking the 16.2.6 bump):**
    - The repo does not appear to define `middleware.ts`; nothing to rename to `proxy.ts`. Confirm with `find apps -name middleware.ts` before release.
    - If any code calls `revalidateTag('x')`, it must now pass a profile, e.g. `revalidateTag('x', 'max')`.
    - `next/image` `quality` is coerced to the closest value in `images.qualities` (default `[75]`).
- **Migration recipe:**
    1. `pnpm up next@16.2.6 eslint-config-next@16.2.6 -F @seedcord/docs`
    2. `pnpm -F @seedcord/docs build` (Turbopack-default; pass `--webpack` only if Turbopack regresses).
    3. Smoke-test the `/docs/packages/[packageId]/[versionId]/[[...entitySegments]]` route.

### react: 19.2.3 -> 19.2.6 and react-dom: ^19.2.3 -> 19.2.6

- **Breaking changes:** none. Patch release. Matches the cancrops pin.
- **Sibling alignment:** bump `@types/react` to 19.2.15 (latest) or at least 19.2.14 (cancrops pin) in the catalog. `@types/react-dom` already at 19.2.3 latest; no change.
- **Migration recipe:**
    1. Update the `catalog:deps` block in the root `pnpm-workspace.yaml` for `react`, `@types/react`.
    2. `pnpm -F @seedcord/docs up react-dom@19.2.6 @types/react-dom@19.2.3`.
    3. `pnpm install` from repo root.

### @types/react: 19.2.7 -> 19.2.15

- Patch bumps in DT types only. No JSX runtime contract change.

### eslint-config-next: ^16.1.0 -> 16.2.6

- Must track `next` major/minor. Bump alongside next. Flat config is the default in 16; the lint rule set is unchanged across 16.1->16.2.

### Radix UI (dialog, dropdown-menu, popover, slot, tooltip)

- **All five packages are already on their respective latest stable versions** as of 2026-05-24:
    - `@radix-ui/react-dialog@1.1.15`
    - `@radix-ui/react-dropdown-menu@2.1.16`
    - `@radix-ui/react-popover@1.1.15`
    - `@radix-ui/react-slot@1.2.4`
    - `@radix-ui/react-tooltip@1.2.8`
- **No major bump available.** Radix has not shipped a 2.x for dialog/popover/slot/tooltip. The repo is already current; no action needed.
- **If a major lands later:** Radix majors typically rename `Portal` placement, drop `forceMount` defaults, and shift CSS-data attribute names. None of those apply today.

### tailwindcss: ^4.1.18 -> 4.3.0 and @tailwindcss/postcss: ^4.1.18 -> 4.3.0

- **Breaking changes:** none across 4.1 -> 4.3. Minor additions only:
    - 4.2.x: new logical layout utilities (`pbs-*`, `pbe-*`, `mbs-*`, `mbe-*`, `inline-*`, `block-*`, `inset-s-*`, `inset-e-*`), new color palettes (mauve, olive, mist, taupe), `font-features-*`, `@tailwindcss/webpack` plugin. `start-*` / `end-*` deprecated in favor of `inset-s-*` / `inset-e-*` (deprecation only, still works).
    - 4.3.0: `@container-size`, `scrollbar-*` (track/thumb/auto/thin/none), `scrollbar-gutter-*`, `zoom-*`, `tab-*`. `@variant` now supports stacked + compound forms. `--default(...)` in functional `@utility`. Vite plugin fixes for entry resolution.
- **Cancrops parity:** matches their pin.
- **Seedcord file check:** `apps/docs/postcss.config.mjs` already loads `@tailwindcss/postcss`. No config change needed. `apps/docs/src/styles/tokens.css`, `globals.css`, `utilities.css` use only `@theme` / `@layer` / `@variant` constructs that remain valid.
- **Migration recipe:** bump both packages together; `pnpm -F @seedcord/docs build`.

### @tailwindcss/vite: 4.3.0 (not used today)

- Only relevant for future Vite-based seedcord apps that match the cancrops pattern. Drop-in replacement for `@tailwindcss/postcss` when migrating off Next.js.

### prettier-plugin-tailwindcss: ^0.7.2 -> 0.8.0

- **Breaking change:** 0.8.0 raises the minimum Prettier peer to v3.4 and updates the class-sorting algorithm to follow Tailwind v4.3 ordering. Class order in committed files may shift on first run.
- **Migration recipe:**
    1. Bump.
    2. Run `pnpm -F @seedcord/docs fmt` to re-sort. Commit the diff separately so the noise is isolated.

### clsx: ^2.1.1

- Already latest. No change.

### tailwind-merge: ^3.4.0 -> 3.6.0

- Minor patch. No breaking changes. Adds support for Tailwind 4.3 utility classes (scrollbar, zoom, tab) so they merge correctly. Bump alongside tailwindcss.

### cmdk: ^1.1.1

- Already latest. **No cmdk 2.0 exists.** The 1.0 line introduced these breaks already absorbed by seedcord:
    - `Command.Item` `value` prop is case-sensitive (was lowercased).
    - `Command.List` is required.
    - Attribute selectors must use `[aria-disabled="true"]`, not `[aria-disabled]`.
- Seedcord usage in `apps/docs/src/components/search/command-palette/CommandPaletteDialog.tsx` imports `Command` from `cmdk` and is already on 1.1.1; no migration owed.

### lucide-react: ^0.562.0 -> 1.16.0 (MAJOR)

- **This is the headline breaking change** in the bundle.
- **Breaking changes (v1.0.1, since 1.0.0 was published in error):**
    - **All brand icons removed** for trademark reasons. Any `<Github />`, `<Twitter />`, `<Discord />`, `<Slack />`, etc. icon imports from lucide-react will fail. Replacement: use [Simple Icons](https://simpleicons.org/) (separate package) for brand logos.
    - **`aria-hidden="true"` is the new default** on every icon. If any seedcord icon serves as the _sole_ accessible name of a button or link (no visible label), it must now be explicitly given `aria-hidden={false}` + `aria-label`, or the parent button needs `aria-label`.
    - **UMD builds removed.** ESM and CJS only. Seedcord uses ESM via Next, so no impact.
    - **Vue package rename:** `lucide-vue-next` -> `@lucide/vue`. N/A for seedcord (React).
    - **Context providers** are now supported for default icon props (size, stroke-width, color). Optional adoption.
    - Stable font code points for the `lucide` icon-font package (irrelevant for `lucide-react`).
- **NOT documented as breaking but worth checking:** specific icon renames are not enumerated in the v1 release notes. Lucide's policy is that any renamed icon ships with an alias for one major version, so most existing imports keep working. A `pnpm -F @seedcord/docs lint` pass plus `pnpm -F @seedcord/docs tc` will flag any actually-removed identifiers.
- **Migration recipe:**
    1. Inspect every `lucide-react` import in `apps/docs/src/components/**` for brand icons. Grep: `rg "from 'lucide-react'" apps/docs/src` and audit the named imports.
    2. Bump `lucide-react` to `^1.16.0`.
    3. Run `pnpm -F @seedcord/docs tc` and resolve any missing-export errors (these will almost always be brand icons).
    4. Audit icon-only buttons. Anywhere an icon is the only child of a `<button>` without an `aria-label`, add `aria-label`. Tooltips do not satisfy the accessible-name requirement on their own.
    5. Optional: introduce `<LucideProvider>` at the root layout to set a default `size`/`strokeWidth` so individual components can stay terser.
- **Cancrops parity:** matches their pin (`1.16.0`).

### next-themes: ^0.4.6

- Already latest. No 1.0 yet. No action.
- `apps/docs/src/components/providers/**` integration with `ThemeProvider` remains valid.

### marked: ^17.0.1 -> 18.0.4 (MAJOR)

- **Breaking changes in 18.0:**
    1. Trailing blank lines are trimmed from block tokens. Any custom renderer or walker that relied on preserved trailing whitespace inside block tokens will produce slightly different output.
    2. TypeScript types regenerated against TS 6. Some structural type narrowings tightened; consumers on TS 5.1-5.9 should still compile but may need to adjust `Token` discriminators.
- **Seedcord impact:** the docs app uses `marked` to render TSDoc summaries / descriptions. The trailing-blank-line trim is unlikely to change visible output because the engine post-processes through DOM helpers. The TS impact is the larger concern.
- **Migration recipe:**
    1. Bump.
    2. `pnpm -F @seedcord/docs tc` and fix any `Token`-typing fallout.
    3. Visually diff one rendered doc page before/after.

### postcss: ^8.5.6 -> 8.5.15

- Patch range. Safe. Required to satisfy `@tailwindcss/postcss@4.3.0` peer.

### shiki: ^3.20.0 -> 4.1.0 (MAJOR)

- **Breaking changes in 4.0 (per release notes + migration page):**
    - **Drops Node 18.** Seedcord targets >= Node 20 (Next 16 requires 20.9+), so this is moot.
    - **Removes deprecated APIs.** The migration page states that anyone on v3 without active deprecation warnings can upgrade directly to v4. The set of removals is the historical pile of deprecations: top-level `setCDN`, `loadLanguage`, `loadTheme`, `setWasm`, single `theme:` option (must be `themes:` array form on `codeToHtml`), `codeToThemedTokens` (renamed to `codeToTokensBase`), CSS-variables theme support, CJS/IIFE builds dropped at the v3 boundary already.
    - Package layout reshuffle: `@shikijs/primitive` got leaner, new `@shikijs/markdown-exit` companion. Neither is imported directly by seedcord.
- **Seedcord file check (`apps/docs/src/lib/shiki.ts`):** uses `getSingletonHighlighter`, `codeToHtml({ lang, theme })`, `BundledLanguage`, `BundledTheme`, `Highlighter`. All of these are stable v3 APIs that remain in v4. The `codeToHtml({ lang, theme: THEMES.dark })` form is the supported single-theme call (the "removed `theme:` option" deprecation was about the implicit highlighter-level default, not the per-call option). No code change required.
- **Migration recipe:**
    1. Bump shiki to `^4.1.0`.
    2. `pnpm -F @seedcord/docs build`.
    3. Smoke-test a docs page that exercises both `highlightToHtml` and `highlightInlineToHtml` and confirm both light and dark variants render.
- **Risk note:** v4 reportedly produces "slightly different HTML" from internal hast restructuring. Any CSS selector in `apps/docs/src/styles/*.css` that targets `.shiki .line` or similar deep span structure should be visually verified.

### zustand: ^5.0.9 -> 5.0.13

- Patch range. Safe. Required to satisfy `@tailwindcss/postcss@4.3.0` peer.

### shiki: ^3.20.0 -> 4.1.0 (MAJOR)

- **Breaking changes in 4.0 (per release notes + migration page):**
    - **Drops Node 18.** Seedcord targets >= Node 20 (Next 16 requires 20.9+), so this is moot.
    - **Removes deprecated APIs.** The migration page states that anyone on v3 without active deprecation warnings can upgrade directly to v4. The set of removals is the historical pile of deprecations: top-level `setCDN`, `loadLanguage`, `loadTheme`, `setWasm`, single `theme:` option (must be `themes:` array form on `codeToHtml`), `codeToThemedTokens` (renamed to `codeToTokensBase`), CSS-variables theme support, CJS/IIFE builds dropped at the v3 boundary already.
    - Package layout reshuffle: `@shikijs/primitive` got leaner, new `@shikijs/markdown-exit` companion. Neither is imported directly by seedcord.
- **Seedcord file check (`apps/docs/src/lib/shiki.ts`):** uses `getSingletonHighlighter`, `codeToHtml({ lang, theme })`, `BundledLanguage`, `BundledTheme`, `Highlighter`. All of these are stable v3 APIs that remain in v4. The `codeToHtml({ lang, theme: THEMES.dark })` form is the supported single-theme call (the "removed `theme:` option" deprecation was about the implicit highlighter-level default, not the per-call option). No code change required.
- **Migration recipe:**
    1. Bump shiki to `^4.1.0`.
    2. `pnpm -F @seedcord/docs build`.
    3. Smoke-test a docs page that exercises both `highlightToHtml` and `highlightInlineToHtml` and confirm both light and dark variants render.
- **Risk note:** v4 reportedly produces "slightly different HTML" from internal hast restructuring. Any CSS selector in `apps/docs/src/styles/*.css` that targets `.shiki .line` or similar deep span structure should be visually verified.

### zustand: ^5.0.9 -> 5.0.13

- **No zustand 6.0.** Latest is 5.0.13.
- Patch deltas only since 5.0.9: race-condition fix in `persist`, devtools/immer typing fixes, devtools polish.
- **Seedcord file check (`apps/docs/src/store/ui.ts`):** uses `create<UIStore>(...)` factory with a function returning `{state, actions}`. This is the v5 API and is unchanged. No action.

---

## Recommended bump groups

Group these into focused PRs to keep diffs reviewable:

1. **Patch sweep (zero risk):** next + eslint-config-next, react + react-dom + @types/react, postcss, zustand, tailwind-merge, prettier-plugin-tailwindcss (commit re-sort separately).
2. **Tailwind minor:** tailwindcss + @tailwindcss/postcss together.
3. **Marked major:** marked 17 -> 18 in isolation so any TS or render fallout is bisectable.
4. **Shiki major:** shiki 3 -> 4 in isolation; visually diff highlighted blocks.
5. **Lucide major:** lucide-react 0 -> 1 in isolation; audit brand icons + a11y labels.

---

## Top 3 most consequential breaking changes

1. **lucide-react 0.x -> 1.16.0** — removes all brand icons (any `<Github/>`, `<Discord/>`, etc. imports break), flips `aria-hidden` to `true` by default (icon-only buttons without an `aria-label` become unlabeled), and drops UMD builds. Requires a manual audit of every `lucide-react` import in `apps/docs/src/components/**` plus an a11y sweep of icon-only controls.
2. **shiki 3 -> 4** — drops Node 18, removes the long-deprecated legacy APIs, and restructures internal hast so produced HTML is "slightly different." Seedcord's `apps/docs/src/lib/shiki.ts` only uses stable APIs so code stays unchanged, but any CSS that targets shiki-emitted span structure needs visual verification.
3. **marked 17 -> 18** — trims trailing blank lines from block tokens (silent renderer output drift) and ships types built against TypeScript 6, which can tighten `Token` discriminants and cause `tsc --noEmit` failures in the docs engine that consumes `marked`.

Deliverable file: `/Users/dhruv/Desktop/seedcord/seedcord/.vscode/docs/DEP_RESEARCH_FRONTEND.md`
