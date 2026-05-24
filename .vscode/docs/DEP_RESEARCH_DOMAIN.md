# Domain Deps — Dep Bump Research

**Researched:** 2026-05-24
**Researcher:** Claude (Opus 4.7)
**Policy:** chase latest stable, skip if security advisory > MEDIUM in latest; cancrops May-2026 pins are known-good baselines but do not cap us.
**Sources:** Versions verified against `https://registry.npmjs.org/<pkg>` (npm registry). Breaking-change claims cite official release notes / GitHub release pages. (`pnpm view` is blocked on this machine due to `/Users/dhruv/.npm` root ownership — registry was hit directly via WebFetch.)

---

## Discord / runtime framework

### Summary table

| pkg               | current | latest stable | recommended bump | major?               | security |
| ----------------- | ------- | ------------- | ---------------- | -------------------- | -------- |
| discord.js        | 14.25.1 | 14.26.4       | 14.26.4          | no (minor)           | none     |
| envapt            | 4.1.0   | 4.1.1         | 4.1.1            | no (patch)           | none     |
| mongoose          | 9.0.2   | 9.6.2         | 9.6.2            | no (within 9.x)      | none     |
| reflect-metadata  | 0.2.2   | 0.2.2         | hold             | no                   | none     |
| type-fest         | 5.3.1   | 5.6.0         | 5.6.0            | no (minor, additive) | none     |
| chalk             | 5.6.2   | 5.6.2         | hold             | no                   | none     |
| winston           | ^3.19.0 | 3.19.0        | hold             | no (no v4 exists)    | none     |
| winston-transport | ^4.9.0  | 4.9.0         | hold             | no                   | none     |
| strip-ansi        | ^7.1.2  | 7.2.0         | ^7.2.0           | no (minor)           | none     |

### Detailed migrations

#### discord.js 14.25.1 → 14.26.4 (MINOR, no breaking)

**Release context:** No 15.x stable exists yet — only a `15.0.0-dev.<timestamp>` tag floats on the `dev` dist-tag. Do **not** chase 15 (no release notes, no migration guide, surface area still in flux).

Sources:

- <https://github.com/discordjs/discord.js/releases>

**Changes between 14.25 → 14.26.4 (additive features + DM fixes):**

- 14.26.0 — added modal radio-group / checkbox components for v14; partial `DMChannel` without client user; error-type differentiation; removed unnecessary `ManageMessages` check for pinnable.
- 14.26.1 / .2 — DMChannel recipient correctness fixes.
- 14.26.3 — TeamMember default `permissions`.
- 14.26.4 — receive DMs in uncached `DMChannel` again.

**No breaking changes documented.** No removals to `MessageFlags`, embed builders, slash command APIs, or event signatures. `MessageFlags.IsComponentsV2` usage in `packages/seedcord/src/effects/**` is unaffected.

**Required code changes:** none — straight bump.

**Sequencing:** bump the catalog `discord.js: 14.25.1 → 14.26.4`; `mock/` and `packages/seedcord/**` will pick it up automatically. `packages/services/**` also picks it up (it imports `discord.js` for typing).

#### envapt 4.1.0 → 4.1.1 (PATCH)

Cancrops pin matches latest. Patch release. Bump in catalog (`envapt: 4.1.0 → 4.1.1`), no code changes required.

#### mongoose 9.0.2 → 9.6.2 (MINOR, several features)

**Release context:** v10 has **not** been released. `9.6.2` is latest stable; `next` dist-tag points to `9.0.0-rc1` (stale). The current 9.x line predates Mongoose v10 work.

Sources:

- <https://raw.githubusercontent.com/Automattic/mongoose/master/CHANGELOG.md>

**v9.0.0 baseline breaking changes (already absorbed by current 9.0.2 pin):**

- callback-based pre middleware dropped (async/await only).
- MongoDB Node driver bumped to v7.
- UUID schematype returns BSON `UUID`, not Buffer.
- `findOne(null)` / `find(null)` throw rather than returning the first doc.
- Update pipelines disallowed by default — need `updatePipeline: true` option.
- Browser build removed; deprecated callback-based hooks removed; validators async-ified.

**9.0.3 → 9.6.2 additive changes that may matter to plugins:**

- `Schema.create()` helper for stricter TS inference (consider adopting in `packages/plugins/src/**` model factories).
- `allowNull` schema option (9.6.0) — disallow null even when not required.
- `$getChanges()` alias added; `getChanges()` deprecated (warning only).
- `toJSONSchema()` on schemas / schematypes.
- `cloneUpdate: false` option to disable update cloning.
- `pipelineForUnionWith()` TS helper for `$unionWith`.
- 9.6.0: fixed `watch()` on disconnected connection (relevant if plugins do change streams).

**Required code changes for the bump:**

- Replace `doc.getChanges()` with `doc.$getChanges()` in `packages/plugins/src/**` if used (deprecation warning, no removal yet).
- No connection-event signature changes between 9.0.2 and 9.6.2.

**Sequencing:** standalone — bump catalog `mongoose: 9.0.2 → 9.6.2`. Only consumer is `packages/plugins`.

#### reflect-metadata — hold at 0.2.2

Latest stable. v0.2.0 and v0.2.1 are deprecated on npm (critical fallback bug). 0.2.2 (Mar 2024) is the current head — no newer release. Used by decorators in `packages/seedcord/src/bot/**`. No action.

#### type-fest 5.3.1 → 5.6.0 (MINOR, additive only)

No removed types or signature changes between 5.3.1 and 5.6.0. New additions: `Absolute`, `NonNullableDeep`, `Optional`, `ExcludeExactly`, `splitOnPunctuation` option on case-conversion types. Bump catalog `type-fest: 5.3.1 → 5.6.0` — no code changes.

#### chalk — hold at 5.6.2

Latest stable. Released 2025-10-29. No bump needed.

#### winston — hold at ^3.19.0; **no v4 exists**

Latest stable on the `latest` dist-tag is **3.19.0** (released Dec 2025). There is no public 4.x release, no public roadmap entry. The recent rewrite of `packages/services/src/Logger/**` is on the stable major. No action.

Notable in recent 3.19.x patches: File transport finish-flush fix, test runner migrated to Jest internally (no API impact).

#### winston-transport — hold at ^4.9.0

Latest = 4.9.0 (Nov 2024). Tracks `winston` 3.x. No action.

#### strip-ansi ^7.1.2 → 7.2.0 (MINOR)

7.2.0 (Feb 2026) is the current head; depends on `ansi-regex@6.2.2`. ESM-only (matches `"type": "module"` packages). Used by `packages/services/src/Logger/**`. Bump — no code changes.

---

## CLI / framework integration

### Summary table

| pkg                         | current | latest stable | recommended bump           | major?                                           | security |
| --------------------------- | ------- | ------------- | -------------------------- | ------------------------------------------------ | -------- |
| @commander-js/extra-typings | ^14.0.0 | 14.0.0        | hold                       | no                                               | none     |
| commander                   | ^14.0.2 | 14.0.3        | ^14.0.3                    | no (patch)                                       | none     |
| ink                         | ^6.6.0  | 7.0.3         | 7.0.3                      | YES (6 → 7)                                      | none     |
| ink-spinner                 | ^5.0.0  | 5.0.0         | hold (verify ink-7 compat) | no                                               | none     |
| jiti                        | ^2.6.1  | 2.7.0         | ^2.7.0                     | no (minor)                                       | none     |
| minimatch                   | ^10.1.1 | 10.2.5        | ^10.2.5                    | no (minor)                                       | none     |
| fix-esm-import-path         | ^1.10.3 | 1.10.3        | hold                       | no                                               | none     |
| pg                          | ^8.16.3 | 8.21.0        | ^8.21.0                    | no (minor)                                       | none     |
| @types/pg                   | ^8.16.0 | 8.20.0        | ^8.20.0                    | no (minor)                                       | none     |
| kysely                      | ^0.28.9 | 0.29.2        | ^0.29.2                    | YES (0.28 → 0.29; pre-1.0 minor counts as major) | none     |

### Detailed migrations (major bumps only)

#### ink 6.6.0 → 7.0.3 (MAJOR)

**Release context:** Ink 7 released as a React-19 native build. Requires React 19.2+ and Node 22+. seedcord catalog already pins `react: 19.2.3` and `engines.node: >=22.12.0` (raised to `>=22.13.0` if you also adopt the ESLint 10 sequencing from the TS-eco research) — so the prereqs are met.

Sources:

- <https://github.com/vadimdemedes/ink/releases>

**Breaking changes:**

1. **React 19.2 required.** Internal use of `useEffectEvent` — `react@19.1` would error.
2. **Node 22 required.**
3. **`key.delete` vs `key.backspace` split.** Physical backspace now sets `key.backspace`. Any input handler in `packages/cli/src/**` that checks `key.delete` for backspace must be rewritten.
4. **Escape no longer sets `key.meta`.** `key.meta` is reserved for Alt/Meta combos; pressing Escape alone now sets only `key.escape: true`. Audit any handler doing `if (key.meta) ...` to differentiate Escape from real Alt combos.
5. Layout / `<Box>` props expanded (additive). New hooks: `usePaste`, `useWindowSize`, `useBoxMetrics`, `useAnimation`. New `render()` options: `alternateScreen`, `interactive`.

**Required code changes (audit pass in `packages/cli/src/**`):\*\*

- Grep for `key.delete` in any `useInput` handler — split into `key.backspace` (physical backspace) vs `key.delete` (Delete/Forward-Delete).
- Grep for `key.meta` — confirm intent; if it was being used as "modifier OR escape", split it.
- No changes needed if the CLI is purely command-driven and doesn't use `useInput`.

**ink-spinner 5.0.0:** last released March 2023, predates ink 7 — its peer range likely lists ink `^4 || ^5 || ^6`. **Verify** by inspecting `node_modules/ink-spinner/package.json` after the ink 7 install; if pnpm peer-warns, either:

- Wait for an ink-spinner 6.x release, OR
- Inline the spinner component (it's ~30 LOC: a `<Text>` that cycles through `cli-spinners` frames in a `useEffect`).

**Sequencing:** ink 7 must land with ink-spinner verified/replaced in the same PR. React peer is already satisfied.

#### kysely 0.28.9 → 0.29.2 (MAJOR — pre-1.0)

**Release context:** Pre-1.0 minors are de-facto majors. v0.29.0 is "a banger" release per maintainer notes; v0.30 / v1.0 not yet on npm.

Sources:

- <https://github.com/kysely-org/kysely/releases>

**Breaking changes:**

1. **TypeScript 5.4 minimum.** seedcord pins `typescript: 5.9.3` (catalog peer) — satisfied. If the TS-eco bump to TS 6 lands first, still satisfied.
2. **Deprecated APIs removed.** Notably: `withTables` is gone — use `$pickTables` / `$omitTables` instead. Audit `packages/plugins/src/**` for any `.withTables(` call sites.
3. **Migration exports relocated.** Migration helpers must be imported from `'kysely/migration'`; the root re-exports are deprecated (warning only at 0.29, removal slated for next minor). If `packages/plugins/src/**` has any migration tooling, switch the import path.
4. **`AbortSignal` support on `execute`.** Additive but new param shape on overloads — should be source-compatible.
5. **`ReadonlyKysely<DB>`** compile-time-readonly helper added (no migration needed).
6. **`NarrowPartial`** now narrows by deep object keys — may make some previously-loose types stricter. Run `pnpm tc` after the bump.

**Required code changes (audit `packages/plugins/src/**`):\*\*

- Replace `withTables` → `$pickTables` / `$omitTables`.
- Move migration imports to `'kysely/migration'`.
- Re-run `pnpm tc`; expect a few `NarrowPartial`-driven type tightenings.

**Sequencing:** standalone within plugins. No interaction with pg / @types/pg bump.

### Non-major bumps worth calling out

- **commander 14.0.2 → 14.0.3** (patch). 14.0.x is the current stable major. v15 is `next`-tagged at `15.0.0-0` (pre-release; do not adopt yet — `@commander-js/extra-typings` only ships `14.0.0`, lockstep would break). Patch bump only.
- **@commander-js/extra-typings ^14.0.0** — lockstep with `commander` major+minor; both stay on 14.0. Hold.
- **jiti 2.6.1 → 2.7.0** — minor. Used in `packages/seedcord/src/hmr/**` and CLI. No breaking notes in 2.7.0; backwards-compat with 2.6 ESM resolution semantics.
- **minimatch 10.1.1 → 10.2.5** — minor / patch series. No breaking notes.
- **fix-esm-import-path 1.10.3** — already latest. Hold.
- **pg 8.16.3 → 8.21.0** — minor series. Notable items from changelog:
    - `scramMaxIterations` option added (SCRAM iteration cap; security hardening).
    - Compatibility code for Node <16 removed (no impact — seedcord requires Node 22+).
    - `getTransactionStatus()` method added on `Client`.
    - Client internal query-queue deprecated.
    - Past `Client#end` callback fix; prototype pollution fix via column-name handling.
    - No `pg@9` exists yet.
- **@types/pg 8.16.0 → 8.20.0** — minor. Tracks `pg` shape.

---

## Docs tooling

### Summary table

| pkg                      | current | latest stable | recommended bump | major?            | security |
| ------------------------ | ------- | ------------- | ---------------- | ----------------- | -------- |
| typedoc                  | 0.28.15 | 0.28.19       | 0.28.19          | no (patch series) | none     |
| typedoc-plugin-dt-links  | ^2.0.34 | 2.0.56        | ^2.0.56          | no (patch)        | none     |
| typedoc-plugin-mdn-links | ^5.0.10 | 5.1.1         | ^5.1.1           | no (minor)        | none     |
| @leeoniya/ufuzzy         | ^1.0.19 | 1.0.19        | hold             | no                | none     |

### Detailed notes

#### typedoc 0.28.15 → 0.28.19 (PATCH series — no 0.29 yet)

**Release context:** No 0.29.x or 0.30.x on npm. 0.28.19 is current. The `beta` dist-tag points to `0.28.0-beta.2` (stale).

Sources:

- <https://github.com/TypeStrong/typedoc/releases>

**Changes 0.28.15 → 0.28.19 (all additive / fixes):**

- 0.28.16: `@include` region support in `.tsx` / `.cjs` / `.mjs`; TS-in-JS `@typedef` modifier tags via inline `{@mod}`; JSON schema config file published at `typedoc.org/schema.json`.
- 0.28.17: minor.
- 0.28.18: **TypeScript 6.0 support** (relevant once the TS-eco bump to TS 6 lands).
- 0.28.19: French translations; triple-slash comment style requires exactly three slashes (only matters if `packages/docs-generator/src/**` does its own comment scraping).

API tweaks (additive, on `CommentTag` and `Reflection`):

- `CommentTag.typeAnnotation` property.
- `Reflection.hasComment` / `Comment.hasVisibleComponent` now accept optional params.

**Required code changes:** none unless `packages/docs-generator/src/**` does string-equality matching on comment-tag shapes. Worth a grep for `hasComment` / `hasVisibleComponent` after the bump.

#### typedoc-plugin-dt-links ^2.0.34 → 2.0.56

Latest peer is `"typedoc": "0.28.x"` — matches the typedoc bump. Many patch releases; no breaking notes. Bump.

#### typedoc-plugin-mdn-links ^5.0.10 → 5.1.1

Peer **as declared in package.json**: `"typedoc": "0.27.x || 0.28.x"` (confirmed from registry). 5.1.x is compatible with typedoc 0.28.19. (One earlier WebFetch summary listed an older peer range — the canonical manifest at `/typedoc-plugin-mdn-links/5.1.1` lists `0.27.x || 0.28.x`.) Bump.

#### @leeoniya/ufuzzy — hold at 1.0.19

Latest stable. Used in `packages/docs-engine/src/**` runtime search. No action.

---

## Sequencing notes

1. **discord.js + envapt minor bumps + mock/ regression check (single PR).**
    - `discord.js: 14.25.1 → 14.26.4`, `envapt: 4.1.0 → 4.1.1` in `pnpm-workspace.yaml` catalog.
    - `mock/` is the compat test surface — run `pnpm --filter mock build` and a smoke run to confirm `MessageFlags.IsComponentsV2` + interaction wiring still resolves at runtime (no API changes expected).
    - No code changes anticipated in `packages/seedcord/src/bot/**` or `packages/seedcord/src/effects/**`.

2. **mongoose 9.0.2 → 9.6.2 (plugins only).**
    - Catalog bump. Optional follow-up: migrate `getChanges()` → `$getChanges()` in `packages/plugins/src/**` to silence deprecation warning.
    - No connection-event changes affect `packages/services/src/Lifecycle/**`.

3. **ink 7 + react peer + Node engine alignment (CLI only).**
    - React peer (`19.2.3`) and Node (`>=22.12.0`) already satisfy ink 7 prereqs (Node 22+, React 19.2+).
    - **Same-PR work:** audit `packages/cli/src/**` `useInput` handlers for `key.delete` / `key.meta` semantics. Verify `ink-spinner@5.0.0` peer-resolves against ink 7; if it does not, inline the spinner.
    - No interaction with the discord.js or mongoose bumps.

4. **kysely 0.29 (plugins only).**
    - `withTables` → `$pickTables` / `$omitTables` rewrite, migration imports moved to `'kysely/migration'`, `pnpm tc` pass for `NarrowPartial` tightening.
    - Bundle with `pg ^8.21.0` and `@types/pg ^8.20.0` — both are additive and easy to land in the same PR.

5. **typedoc 0.28.19 + both typedoc plugins (docs-generator only).**
    - Lockstep:
        - `typedoc: 0.28.15 → 0.28.19`
        - `typedoc-plugin-dt-links: ^2.0.34 → ^2.0.56`
        - `typedoc-plugin-mdn-links: ^5.0.10 → ^5.1.1`
    - All three plugins declare `typedoc: 0.28.x` peer — lockstep is "stay within 0.28". Bump all three together; verify `packages/docs-generator/**` build still produces the expected reflection tree.
    - Note: this dovetails cleanly with the TS-eco TS 6 bump because 0.28.18 added TS 6 support — do **not** bump TS 6 before typedoc reaches 0.28.18+.

6. **Catalog patch / minor sweep (low risk, one PR).**
    - `type-fest 5.3.1 → 5.6.0`, `strip-ansi ^7.1.2 → 7.2.0`, `jiti ^2.6.1 → ^2.7.0`, `minimatch ^10.1.1 → ^10.2.5`, `commander ^14.0.2 → ^14.0.3`.
    - All additive / patch — single sweep PR.

7. **Hold list (latest = current, do not bump).**
    - `reflect-metadata 0.2.2` (head — newer versions are deprecated).
    - `chalk 5.6.2`.
    - `winston 3.19.0` + `winston-transport 4.9.0` (no v4 in flight; the recent Logger rewrite is on the right major).
    - `@commander-js/extra-typings 14.0.0` (latest; lockstep with `commander` 14.x).
    - `ink-spinner 5.0.0` (latest — but verify ink-7 peer; see step 3).
    - `fix-esm-import-path 1.10.3`.
        - `typedoc-plugin-dt-links: ^2.0.34 → ^2.0.56`
    - `typedoc-plugin-mdn-links: ^5.0.10 → ^5.1.1`
    - All three plugins declare `typedoc: 0.28.x` peer — lockstep is "stay within 0.28". Bump all three together; verify `packages/docs-generator/**` build still produces the expected reflection tree.
    - Note: this dovetails cleanly with the TS-eco TS 6 bump because 0.28.18 added TS 6 support — do **not** bump TS 6 before typedoc reaches 0.28.18+.

8. **Catalog patch / minor sweep (low risk, one PR).**
    - `type-fest 5.3.1 → 5.6.0`, `strip-ansi ^7.1.2 → 7.2.0`, `jiti ^2.6.1 → ^2.7.0`, `minimatch ^10.1.1 → ^10.2.5`, `commander ^14.0.2 → ^14.0.3`.
    - All additive / patch — single sweep PR.

9. **Hold list (latest = current, do not bump).**
    - `reflect-metadata 0.2.2` (head — newer versions are deprecated).
    - `chalk 5.6.2`.
    - `winston 3.19.0` + `winston-transport 4.9.0` (no v4 in flight; the recent Logger rewrite is on the right major).
    - `@commander-js/extra-typings 14.0.0` (latest; lockstep with `commander` 14.x).
    - `ink-spinner 5.0.0` (latest — but verify ink-7 peer; see step 3).
    - `fix-esm-import-path 1.10.3`.
    - `@leeoniya/ufuzzy 1.0.19`.

---

## Security advisories

No reviewed advisories were found in GHSA for any of these packages in 2025 or 2026 at the latest stable versions queried above. Notable security-adjacent items rolled into the recommended bumps:

- **pg 8.21.0** — SCRAM iteration cap (`scramMaxIterations` option) added; prior fix for prototype pollution via column-name handling shipped earlier in 8.x.
- **reflect-metadata 0.2.0 / 0.2.1** — npm-deprecated due to critical fallback bug; **0.2.2 (current pin) is the safe head**.

All other bumps are clean of security-driven motivation.
