# TODO 05: Dep bump — domain deps (discord / cli / docs)

## Overview

Bump domain deps per `.vscode/docs/DEP_RESEARCH_DOMAIN.md`. Per the research, only **ink 6 → 7** and **kysely 0.28 → 0.29** are true majors. discord.js stays 14.x (no stable v15), mongoose stays 9.x (additive 9.0 → 9.6), winston stays 3, pg stays 8, commander stays 14. typedoc + plugins lockstep is a no-break rebuild.

## Goals

1. **ink 6 → 7** in `packages/cli` with input-handling semantics audit (`key.backspace` swap from `key.delete`, escape no longer flips `key.meta`)
2. **ink-spinner** — confirm peer compat with ink 7 or replace
3. **kysely 0.28 → 0.29** in `packages/plugins` (replace `withTables` → `$pickTables`/`$omitTables`, relocate migration helpers to `'kysely/migration'`)
4. **typedoc 0.28 → 0.28.19** + plugins lockstep (rebuild only)
5. **mongoose additive 9.0.2 → 9.6.2** — additive; spot-check plugin schema strictness
6. **All other domain deps to latest minors/patches**

## Source of truth

`.vscode/docs/DEP_RESEARCH_DOMAIN.md`. Read before starting.

---

## Files to Change

### Files to MODIFY

| File                                       | Change                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `pnpm-workspace.yaml`                      | bump `deps`, `cli`, `drivers`, `docs` bucket versions per research              |
| `packages/cli/src/**`                      | input-handler semantic shifts (key.backspace vs key.delete); render shape audit |
| `packages/cli/package.json`                | if `ink-spinner` needs replacement, swap dep                                    |
| `packages/plugins/src/**`                  | replace `withTables` API; migration helper import paths                         |
| `packages/docs-generator/src/extractor.ts` | rebuild against typedoc 0.28.19; spot check                                     |
| `mock/`                                    | confirm dep resolution after mongoose minor bump                                |

---

## Implementation Approach

### Commit 1 — Safe minors / patches

`mongoose 9.0.2 → 9.6.2`, `discord.js latest 14.x`, `envapt 4.1.1` (cancrops pin), `chalk` latest, `type-fest` latest, `winston` latest 3.x patch, `commander` patch, `@commander-js/extra-typings` patch, `jiti` patch, `minimatch` patch, `pg` patch, `winston-transport` patch.

```sh
# Catalog bumps in deps/cli/drivers buckets
pnpm install
pnpm prePush
git commit -m "chore(deps): patch + minor sweep on domain deps"
```

### Commit 2 — typedoc + plugins lockstep

```sh
# Bump docs bucket: typedoc 0.28.19, typedoc-plugin-dt-links latest, typedoc-plugin-mdn-links latest
pnpm install
pnpm -C packages/docs-generator build
pnpm -C packages/docs-engine build
pnpm docs:smoke
# Verify samples diff is empty or expected
git diff debugging/samples/
git commit -m "chore(deps): typedoc + plugins lockstep bump"
```

### Commit 3 — ink 6 → 7

1. Bump catalog `cli.ink` to 7.x latest
2. Audit `packages/cli/src/**` for usages of `key.delete`, `key.backspace`, `key.meta` — adjust per ink 7 semantics
3. Confirm `ink-spinner` 5.0.0 peer-resolves vs ink 7. If not:
    - Try `ink-spinner` newer version (if exists)
    - Or inline a small `<Spinner />` component locally (5-10 lines)
4. Run `pnpm -C packages/cli test`; the existing `hmr.test.ts` exercises React-in-Ink — should still pass
5. Manual smoke: `pnpm -C packages/cli dev` (or via mock) — visual check the CLI renders correctly

```sh
pnpm install
pnpm -C packages/cli lint:fix
pnpm -C packages/cli tc
pnpm -C packages/cli test
git commit -m "chore(deps): ink 6 → 7 (input-handler semantic audit + ink-spinner compat)"
```

Changeset: minor on `@seedcord/cli` (ink peer surface change for consumers of CLI components).

### Commit 4 — kysely 0.29

1. Bump catalog `drivers.kysely` to 0.29 latest
2. `rg "withTables" packages/plugins/src` — replace each call site with `$pickTables` or `$omitTables` per the research recipe
3. `rg "from 'kysely'" packages/plugins/src` — for migration helpers, switch to `from 'kysely/migration'`
4. Re-run `pnpm -C packages/plugins tc` — fix any `NarrowPartial` inference drift
5. Test

```sh
pnpm install
pnpm -C packages/plugins lint:fix && tc && test
git commit -m "chore(deps): kysely 0.28 → 0.29 — replace withTables API + relocate migration helpers"
```

Changeset: minor on `@seedcord/plugins`.

### Commit 5 — Stragglers

Any other domain dep at a clean patch (research will surface them).

```sh
pnpm install && pnpm prePush
git commit -m "chore(deps): straggler patch bumps"
```

---

## Acceptance Criteria

- [ ] `pnpm prePush` exits clean
- [ ] `pnpm -C mock dev` smokes cleanly
- [ ] `pnpm docs:smoke` produces samples consistent with baseline
- [ ] CLI manual smoke: `pnpm -C packages/cli dev` shows the spinner / command output as before
- [ ] No `// TODO: revisit ink input` left in code
- [ ] Changesets added for `@seedcord/cli` (minor) and `@seedcord/plugins` (minor)

---

## Risks and Mitigation

| Risk                                                                | Mitigation                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| ink 7 input semantics break a TUI prompt                            | Manual smoke of every interactive flow before commit    |
| `ink-spinner` doesn't support ink 7 → user has to wait for upstream | Inline a 10-line custom spinner as fallback             |
| kysely `NarrowPartial` deep-key inference flags new errors          | Fix at call sites, don't widen types                    |
| typedoc plugin lockstep produces different sample output            | Document the diff in DOCS_SYSTEM later as "intentional" |

---

## Related TODOs

- Blocked by: TASK-02 (catalog)
- Blocks: TASK-10 (cli quality fixes may overlap with ink 7 changes; do ink bump first), TASK-15 (engine consumes generator output — typedoc lockstep should land first)

---

## Notes

- **Complexity:** Medium (ink + kysely are the hard parts)
- **Files affected:** workspace yaml + ~10-20 source files (cli, plugins)
- **Touches published packages:** Yes — changesets minor on `@seedcord/cli`, `@seedcord/plugins`
- **Estimated wall-clock:** 3-5 hours

---

## Handoff

- 2026-05-25 — completed by Claude Opus on sub-branch `chore/dep-bump-batch-01-05`. Four commits: `1df74bc8` (patch + minor sweep: discord.js 14.26.4, envapt 4.1.1, mongoose 9.6.2, type-fest 5.6.0, strip-ansi 7.2.0, commander 14.0.3, jiti 2.7.0, minimatch 10.2.5, pg 8.21.0, @types/pg 8.20.0), `5afda04b` (typedoc lockstep), `ffda6f71` (ink 7 — `ink-spinner@5.0.0` peer accepts ink 7 natively, no inline replacement needed), `c5762703` (kysely 0.29 — relocated migration helpers to `kysely/migration`). No `.getChanges()` or `.withTables()` call sites needed migration. Mock smoke + docs:smoke both unchanged from baseline.
