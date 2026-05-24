# TODO 18: `scripts/seed-artifacts.ts` — seed artifacts repo from existing tags

## Overview

`seedcord/artifacts` is empty. Before the publish workflow (TASK-19) can run, the repo needs:

- A baseline `index.json` reflecting current published versions
- A `project.json` for each (package, version) that's already published to npm

This script does both, idempotently. Run once locally with `ARTIFACTS_PAT` to seed; the workflow takes over thereafter.

## Goals

1. **Discover published versions**: read `git tag` to enumerate every shipped tag, parse out (`package`, `version`) tuples.
2. **For each tuple**: `git checkout <tag>` (in a worktree to avoid disturbing the active checkout), `pnpm install`, run `pnpm docs:extract --package <pkg> --source-path packages/`, capture `project.json`.
3. **Push to artifacts repo**: under `packages/<name>/releases/<version>/project.json` (or prerelease/ as appropriate). Idempotent — skip if path already exists.
4. **Build `index.json`** matching the schema from TASKS.md / `TASK-15` and push it.
5. **Branch flag**: by default push to `main`; allow `--branch dev-pipeline-test` for testing per grilling decision.

## Files to Change

### Files to CREATE

- `scripts/seed-artifacts.ts` — the seed script
- (Maybe) `scripts/lib/index-builder.ts` — pulled-out helper for assembling `index.json` (reused by TASK-19's workflow logic)

### Files to MODIFY

- `package.json` (root) — add `seed:artifacts` script invoking the new file

---

## Implementation Approach

### Step 1 — Enumerate tags

```sh
git tag --format='%(refname:short)' | grep -E '^(seedcord|@seedcord/.+)@'
```

Yields lines like `seedcord@0.10.6`, `@seedcord/utils@0.8.4`, etc.

Parse: split on `@` (mind that `@seedcord/utils@0.8.4` has two `@` — last token is version). Extract pkg + version.

### Step 2 — Per-tag worktree extraction

```ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const tag of tags) {
    const worktreeDir = mkdtempSync(join(tmpdir(), 'seedcord-doc-'));
    execFileSync('git', ['worktree', 'add', '--detach', worktreeDir, tag]);
    try {
        execFileSync('pnpm', ['install', '--frozen-lockfile'], { cwd: worktreeDir });
        const outputDir = join(worktreeDir, 'generated');
        execFileSync(
            'pnpm',
            ['docs:extract', '-o', outputDir, '-p', join(worktreeDir, 'packages'), '--package', pkgName(tag)],
            { cwd: worktreeDir }
        );
        const projectJson = readFileSync(join(outputDir, `${pkgFolder(tag)}/project.json`));
        await pushToArtifactsRepo(projectJson, pathFor(tag), tag);
    } finally {
        execFileSync('git', ['worktree', 'remove', '--force', worktreeDir]);
        rmSync(worktreeDir, { recursive: true, force: true });
    }
}
```

### Step 3 — Index assembly

Build `IndexJson` shape:

- `schemaVersion: 1`
- `updatedAt: new Date().toISOString()`
- `packages`: per-pkg `{ fullName, stable: { latest, latestByMinor, latestByMajor }, prerelease: { latest } | null }`
- `pathTemplates`: `{ stable: 'packages/{name}/releases/{version}/project.json', prerelease: 'packages/{name}/prerelease/{version}/project.json' }`

Use `semver` (will need to add to a catalog or vendor a tiny implementation; ~50 LOC).

### Step 4 — Push to artifacts repo

Use the `commit-to-artifacts-repo` composite from TASK-08 logically (but here we're running locally as a script, so use git directly):

```ts
// Clone to /tmp/artifacts using ARTIFACTS_PAT
// Copy project.json files into their target paths
// Write index.json
// Commit with conventional message
// Push to ${BRANCH:-main}
```

Idempotency: check if a path already exists in the artifacts repo before committing — skip and log if so. This lets the script be safely re-run.

### Step 5 — CLI surface

```sh
ARTIFACTS_PAT=... pnpm seed:artifacts                       # production: pushes to main
ARTIFACTS_PAT=... pnpm seed:artifacts --branch dev-pipeline-test  # testing: pushes to test branch
ARTIFACTS_PAT=... pnpm seed:artifacts --dry-run             # logs what would happen without pushing
```

### Step 6 — Commit + run

```sh
git commit -m "feat(scripts): seed-artifacts.ts — seed artifacts repo from published tags"
# Then run it for the test branch:
ARTIFACTS_PAT=<token> pnpm seed:artifacts --branch dev-pipeline-test
```

---

## Acceptance Criteria

- [ ] Script enumerates every existing published tag
- [ ] Script produces a valid `index.json` for each pushed batch
- [ ] Script is idempotent: re-running on the same artifacts state is a no-op
- [ ] Dry-run mode logs every intended action without side effects
- [ ] On completion, artifacts repo's dev-pipeline-test branch has the expected tree

---

## Risks and Mitigation

| Risk                                                                                 | Mitigation                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| A historical tag's source doesn't build with current pnpm / Node — extraction fails  | Catch + log; skip that tag; continue with the next            |
| Worktree leaves dangling dirs on script kill                                         | trap SIGINT + remove worktree; `git worktree prune` at start  |
| `--package` flag depends on TASK-14 landing first                                    | Hard dependency; document in commit                           |
| ARTIFACTS_PAT leaked in CI logs 't build with current pnpm / Node — extraction fails | Catch + log; skip that tag; continue with the next            |
| Worktree leaves dangling dirs on script kill                                         | trap SIGINT + remove worktree; `git worktree prune` at start  |
| `--package` flag depends on TASK-14 landing first                                    | Hard dependency; document in commit                           |
| ARTIFACTS_PAT leaked in CI logs                                                      | Script never logs the token; uses x-access-token git URL only |

---

## Related TODOs

- Blocked by: TASK-14 (scoped extraction), TASK-15 (engine consumes the seeded index)
- Blocks: TASK-19 (publish workflow needs index.json baseline to diff against)

---

## Notes

- **Complexity:** High (multi-step process with checkout/install/extract per tag)
- **Files affected:** 1 new script + 1 helper + root package.json
- **Touches published packages:** No
- **Estimated wall-clock:** 5-8 hours
