# TODO 14: docs-generator — version-aware (`--package`, `--source-path`, `--tag-mode`)

## Overview

The CI publish workflow (TASK-19) needs to invoke the generator scoped to one package at a time, against a `git checkout <tag>` working tree. Today the generator runs across the whole `packages/` directory by default. Add CLI flags to scope it.

## Goals

1. **`--package <name>` flag**: extract only the specified workspace package (e.g. `--package @seedcord/utils` or `--package utils`).
2. **`--source-path <path>` flag**: override the default `packages/` root with a custom path. CI uses this to point at a `git worktree` checkout of a specific tag.
3. **`--tag-mode` flag** (or similar): toggle behavior between "extract all" (local dev) and "extract single" (CI). May not need a flag — `--package` presence implies single-mode.
4. **Backwards compat**: `pnpm docs:extract` (no flags) still works as today.

## Files to Change

### Files to MODIFY

| File                                                        | Change                                                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `scripts/extract-docs.ts`                                   | accept `--package`, `--source-path`; emit only that package's `project.json` when scoped |
| `packages/docs-generator/src/workspace.ts` (and `paths.ts`) | accept overrides for package selection + source root                                     |
| `packages/docs-generator/src/extractor.ts`                  | scope typedoc invocation per package when scoped                                         |
| `packages/docs-generator/src/index.ts`                      | export the new programmatic API surface (if added)                                       |
| `packages/docs-generator/tests/`                            | add tests for scoped extraction                                                          |

### Files to CREATE

- `packages/docs-generator/tests/scoped-extraction.test.ts` — assert `--package` + `--source-path` produce a single `project.json` for the named package

---

## Implementation Approach

### Step 1 — Read current entry surface

```sh
cat scripts/extract-docs.ts
cat packages/docs-generator/src/workspace.ts
cat packages/docs-generator/src/paths.ts
```

Understand: current default is "find all packages in workspace, extract each." We're adding a scoped mode.

### Step 2 — Define API

#### Programmatic

```ts
// packages/docs-generator/src/index.ts
export interface ExtractOptions {
    outputDir: string;
    packagesRoot?: string; // default: pnpm workspace root + 'packages/'
    packageName?: string; // default: undefined = extract all
    // ... existing options
}

export async function extractDocs(options: ExtractOptions): Promise<ExtractResult>;
```

#### CLI (scripts/extract-docs.ts)

```sh
# Existing behavior
pnpm docs:extract -o ./generated -p ./packages

# New scoped behavior
pnpm docs:extract -o ./generated -p ./packages --package @seedcord/utils
pnpm docs:extract -o ./generated --source-path /tmp/seedcord-v0.10.6/packages --package @seedcord/utils
```

### Step 3 — Implement

- Argument parsing (whatever the current script uses — likely Commander or manual `process.argv`)
- Resolution: if `--package` is given, look up its `package.json` under `--source-path`/`packages/<name>` (or wherever the workspace layout points)
- Pass scoped `tsconfig.json` / entry to typedoc

### Step 4 — Tests

```ts
// scoped-extraction.test.ts
it('extracts only @seedcord/utils when --package is set', async () => {
    const result = await extractDocs({
        outputDir: '/tmp/test-scoped',
        packagesRoot: 'packages',
        packageName: '@seedcord/utils'
    });
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]?.name).toBe('@seedcord/utils');
});
```

### Step 5 — Commit

```sh
git commit -m "feat(docs-generator): scoped extraction via --package + --source-path flags"
```

Changeset: minor on `@seedcord/docs-generator`.

---

## Acceptance Criteria

- [ ] `pnpm docs:extract` (no flags) works identically to today
- [ ] `pnpm docs:extract --package @seedcord/utils` produces only `generated/utils-<version>/project.json` (or whatever the per-package output convention is)
- [ ] `pnpm docs:extract --source-path /tmp/seedcord-v0.10.6/packages --package @seedcord/utils` extracts from the external source tree
- [ ] Tests cover both modes
- [ ] Changeset added

---

## Risks and Mitigation

| Risk                                                                                                     | Mitigation                                                                                                    |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Scoped mode misses cross-package symbol resolution (e.g. `@seedcord/utils` re-exports `@seedcord/types`) | Test: assert cross-package references in the scoped output use `externalUrl` resolution, not silently dropped |
| `--source-path` doesn't have an installed `node_modules/` so typedoc can't resolve types                 | CI step: `pnpm install` against the checkout before running extraction                                        |

---

## Related TODOs

- Blocked by: TASK-13 (lib/docs cleanup — engine concerns moved out)
- Blocks: TASK-15 (engine consumes scoped output), TASK-18 (seed script invokes scoped mode), TASK-19 (publish workflow invokes scoped mode)

---

## Notes

- **Complexity:** Medium
- **Files affected:** 4-6 + 1 new test
- **Touches published packages:** Yes — `@seedcord/docs-generator` minor (new public flags + programmatic API)
- **Estimated wall-clock:** 3-5 hours
