# TODO 13: `apps/docs/lib/docs` cleanup — move engine concerns to `@seedcord/docs-engine`

## Overview

Per `TASKS.md` item 11: "Read all code in apps/docs/lib/docs and see what can be moved to the engine. Make sure to clean up files. Remove unused code as well."

The `.vscode/audits/QUALITY-apps-docs.md` audit produced a detailed cleanup map (see "lib/docs/ Cleanup Candidates" section in that audit). Per that map:

- **Move to `@seedcord/docs-engine`**: routes/resolver/packages/builders/comments/tone-vocabulary — these are engine-layer concerns reused across any frontend
- **Stay in apps/docs**: `engine.ts`, `catalog.ts`, `shiki.ts` — Next-specific glue / app-local state

## Goals

1. **Move every engine-layer file** from `apps/docs/src/lib/docs/**` to a new `packages/docs-engine/src/<dir>/<name>.ts` location per the audit's map.
2. **Re-export from `@seedcord/docs-engine`** (`index.ts`) what the app needs to consume.
3. **Update every apps/docs import** from `@lib/docs/...` to `@seedcord/docs-engine` (or the package's deeper subpath if exposed).
4. **Delete orphaned files** in apps/docs/src/lib/docs/ after the move.
5. **Keep app-local glue** (`engine.ts`, `catalog.ts`, `shiki.ts`) in place — they import from `@seedcord/docs-engine` now instead of from sibling files.
6. **Tests follow the code** — any tests under `apps/docs/tests` for moved modules move to `packages/docs-engine/tests`.

## Source of truth

- `.vscode/audits/QUALITY-apps-docs.md`'s "lib/docs/ Cleanup Candidates" section.

---

## Files to Change

### Files to MOVE (engine-bound)

(Per audit map; verify against the audit file before starting)

- `apps/docs/src/lib/docs/routes.ts` → `packages/docs-engine/src/urls/routes.ts`
- `apps/docs/src/lib/docs/resolveReferenceHref.ts` → `packages/docs-engine/src/urls/resolveReferenceHref.ts`
- `apps/docs/src/lib/docs/packages.ts` → `packages/docs-engine/src/packages.ts`
- `apps/docs/src/lib/docs/builders/**` → `packages/docs-engine/src/builders/**` (or merge into existing `builders/` if names don't collide)
- `apps/docs/src/lib/docs/comments/**` → `packages/docs-engine/src/comments/**`
- `apps/docs/src/lib/docs/formatting.ts` → `packages/docs-engine/src/formatting.ts`
- `apps/docs/src/lib/docs/types.ts` → merge relevant types into `packages/docs-engine/src/types.ts` (de-dupe with existing)
- `apps/docs/src/lib/docs/rawExternalLinks.ts` → `packages/docs-engine/src/rawExternalLinks.ts`
- `apps/docs/src/lib/docs/version.ts` → `packages/docs-engine/src/version-resolution.ts` (rename to avoid colliding with `services/version.ts` pattern)
- `apps/docs/src/lib/docs/loadEntityModel.ts` → `packages/docs-engine/src/loadEntityModel.ts`
- `apps/docs/src/lib/docs/resolveEntityKind.ts` (if separate, or inside builders/) → `packages/docs-engine/src/resolveEntityKind.ts`

### Files to STAY (app-local)

- `apps/docs/src/lib/docs/engine.ts` — Next.js initialization / state wiring
- `apps/docs/src/lib/docs/catalog.ts` — hardcoded catalog (gets replaced in TASK-16 anyway)
- `apps/docs/src/lib/shiki.ts` — Next-specific Shiki integration

### Files to MODIFY

- `packages/docs-engine/src/index.ts` — re-export the new public surface
- `packages/docs-engine/src/internal.index.ts` — re-export internal-only
- `apps/docs/src/**` (every file that imports from `@lib/docs/<moved-thing>`) — update to import from `@seedcord/docs-engine`
- `apps/docs/tsconfig.json` — confirm `@lib/docs/*` alias still resolves (probably yes; we keep it for the things that stay)

### Files to DELETE

- Orphaned files in apps/docs/src/lib/docs/ after moves complete
- Any test files that became orphans

---

## Implementation Approach

### Step 1 — Confirm move list against actual audit

Read `.vscode/audits/QUALITY-apps-docs.md`'s cleanup section. Make the move list above match. The audit is authoritative; if they differ, adjust this file.

### Step 2 — Move with `git mv` (preserves history)

```sh
git mv apps/docs/src/lib/docs/routes.ts packages/docs-engine/src/urls/routes.ts
git mv apps/docs/src/lib/docs/resolveReferenceHref.ts packages/docs-engine/src/urls/resolveReferenceHref.ts
# ... etc per the map
```

### Step 3 — Update imports inside moved files

Moved files may import from `@lib/...` or `next` or `@seedcord/docs-engine` itself. After the move, those imports either:

- Re-target relative to new location (e.g. `'./formatting'` if both files moved together)
- Stay app-local imports that the moved file no longer has access to — refactor (e.g. inject the app concern as a parameter)

This is the hardest part of the cleanup. Take it file by file. Run `pnpm -C packages/docs-engine tc` after each file.

### Step 4 — Re-export from `@seedcord/docs-engine`

Add to `packages/docs-engine/src/index.ts`:

```ts
export * from './urls/routes';
export * from './urls/resolveReferenceHref';
export * from './packages';
export * from './builders'; // if not already
export * from './comments';
export * from './formatting';
// ...
```

For internal-only helpers (audit will flag these), use `internal.index.ts` instead.

### Step 5 — Update apps/docs imports

`rg "from '@lib/docs/(routes|resolveReferenceHref|packages|builders|comments|formatting|types|version)" apps/docs/src` — replace with `from '@seedcord/docs-engine'`.

### Step 6 — Run gates

```sh
pnpm -C packages/docs-engine lint:fix && tc && test
pnpm -C apps/docs lint:fix && tc
pnpm prePush
pnpm docs:smoke
```

Sample diff should be empty (URL shape already fixed in TASK-12).

### Step 7 — Delete orphans

```sh
git status # any deletions still ungathered?
git rm <orphaned-files-if-any>
git commit -m "refactor(docs): move engine-layer code from apps/docs/lib/docs to @seedcord/docs-engine"
```

Changesets:

- `@seedcord/docs-engine` minor (new public exports)
- `apps/docs` no change (not published)

---

## Acceptance Criteria

### Functional

- [ ] No file in `apps/docs/src/lib/docs/` outside of `engine.ts`, `catalog.ts`, `shiki.ts` (and any other audit-flagged stay-here files)
- [ ] Every moved file's logic is reachable via `@seedcord/docs-engine` exports
- [ ] No duplicate logic between engine and app
- [ ] `pnpm docs:smoke` output is byte-identical to pre-cleanup (URL spec fix in TASK-12 already accounted for)

### Code Quality

- [ ] `pnpm prePush` clean
- [ ] No dead imports in moved files
- [ ] `packages/docs-engine/src/index.ts` reflects new exports
- [ ] Audit's cleanup section can be marked "complete" in the audit file

---

## Risks and Mitigation

| Risk                                                                                                    | Mitigation                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Moved files import Next-specific APIs (e.g. `next/navigation`) → engine becomes runtime-coupled to Next | Refactor at the move: parameterize the Next concern away. If unfeasible, the file isn't movable; document why in the audit                   |
| Engine grows test surface but tests stay in apps/docs                                                   | Move tests with their target files (`git mv apps/docs/tests/lib/docs/foo.test.ts packages/docs-engine/tests/foo.test.ts`)                    |
| Engine's new public exports collide with existing names                                                 | Refactor: rename one; prefer adjusting the moved name to avoid breaking engine's existing public surface                                     |
| Cleanup map in audit is incomplete                                                                      | Re-audit after the move; cycle until both files agree (`git mv apps/docs/tests/lib/docs/foo.test.ts packages/docs-engine/tests/foo.test.ts`) |
| Engine's new public exports collide with existing names                                                 | Refactor: rename one; prefer adjusting the moved name to avoid breaking engine's existing public surface                                     |
| Cleanup map in audit is incomplete                                                                      | Re-audit after the move; cycle until both files agree                                                                                        |

---

## Related TODOs

- Blocked by: TASK-09 (apps/docs quality fixes; some findings may move files), TASK-12 (URL spec impl touches `resolveReferenceHref.ts`)
- Blocks: TASK-14 (generator scoping calls into the moved builder layer), TASK-15 (engine index.json consumer)

---

## Notes

- **Complexity:** High (large refactor, lots of import rewiring)
- **Files affected:** 15-30 moves + ~30 import-update sites
- **Touches published packages:** Yes — `@seedcord/docs-engine` minor
- **Estimated wall-clock:** 6-10 hours
