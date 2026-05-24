# TODO 19: docs-publish workflow + composite actions

## Overview

After `publish.yml` runs successfully on `main`, automatically generate docs for any newly published version and push to `seedcord/artifacts`. Uses the composite actions from TASK-08 (`extract-single-package-docs`, `commit-to-artifacts-repo`).

## Goals

1. **Triggered after `publish.yml`** via `workflow_run: completed` filter on conclusion=success on branch=main
2. **Discover new tags** by diffing local `git tag` against the artifacts repo's `index.json`
3. **For each new tag**: checkout, extract scoped docs, push project.json + update index.json
4. **Test against dev-pipeline-test branch** before pointing production at main (per grilling)
5. **No-op cleanly** when no new tags exist

## Files to Change

### Files to CREATE

- `.github/workflows/docs-publish.yml`
- `scripts/sync-docs-to-artifacts.ts` (the script the workflow runs — does the heavy lifting, much like TASK-18's script but in "incremental" mode)

### Files to MODIFY

- `.github/actions/setup` (if exists) — confirm consumed
- `.github/actions/extract-single-package-docs/action.yml` (from TASK-08) — already exists by this point

---

## Implementation Approach

### Step 1 — Sync script

`scripts/sync-docs-to-artifacts.ts` is the incremental version of TASK-18's seed script:

```ts
async function main() {
    const branch = process.env.ARTIFACTS_BRANCH ?? 'main';
    const pat = required('ARTIFACTS_PAT');

    const tags = await enumerateLocalTags();
    const currentIndex = await fetchArtifactsIndex(branch);
    const knownVersions = new Set(allVersionsFromIndex(currentIndex));

    const newTags = tags.filter((tag) => !knownVersions.has(tagKey(tag)));
    if (newTags.length === 0) {
        console.log('No new tags to publish; exiting.');
        return;
    }

    for (const tag of newTags) {
        await extractAndPush(tag, branch, pat);
    }

    const newIndex = await rebuildIndex(tags);
    await pushIndex(newIndex, branch, pat);
}
```

Shares helpers with TASK-18's seed script (factor into `scripts/lib/`).

### Step 2 — Workflow

```yaml
name: docs-publish

on:
    workflow_run:
        workflows: ['publish']
        types: [completed]
        branches: [main]
    workflow_dispatch:
        inputs:
            target-branch:
                description: 'Target branch on artifacts repo (default: main)'
                required: false
                default: 'main'
                type: string

permissions:
    contents: read

concurrency:
    group: docs-publish-${{ github.ref_name }}
    cancel-in-progress: false

jobs:
    sync:
        if: ${{ github.event.workflow_run.conclusion == 'success' || github.event_name == 'workflow_dispatch' }}
        runs-on: ubuntu-latest
        timeout-minutes: 30
        steps:
            - uses: actions/checkout@v5
              with:
                  fetch-depth: 0 # we need all tags
            - uses: ./.github/actions/setup
            - uses: ./.github/actions/setup-tsx
            - name: Sync docs to artifacts repo
              env:
                  ARTIFACTS_PAT: ${{ secrets.ARTIFACTS_PAT }}
                  ARTIFACTS_BRANCH: ${{ github.event.inputs.target-branch || 'main' }}
              run: pnpm exec tsx scripts/sync-docs-to-artifacts.ts
```

### Step 3 — Test on dev-pipeline-test

```sh
# Manually trigger via workflow_dispatch
gh workflow run docs-publish.yml -f target-branch=dev-pipeline-test
gh run watch
```

Verify:

- The workflow lists "newly published tags" correctly
- The artifacts repo's dev-pipeline-test branch ends with the expected file tree + updated index.json
- Re-running is a no-op

### Step 4 — Point production at main

Once dev-pipeline-test works:

- Drop the `target-branch` workflow_dispatch input (or keep it for emergency overrides)
- Default branch in `sync-docs-to-artifacts.ts` is `main`

### Step 5 — Cleanup

After production stabilizes:

```sh
# Delete the test branch on artifacts repo
gh api -X DELETE repos/seedcord/artifacts/git/refs/heads/dev-pipeline-test
```

(Don't delete during the PR — keep it until DOCS_SYSTEM.md is shipped and you're confident the pipeline is rock-solid.)

---

## Acceptance Criteria

- [ ] Workflow file exists and YAML-lints cleanly
- [ ] Manual `workflow_dispatch` with `target-branch=dev-pipeline-test` succeeds; artifacts repo's test branch shows expected content
- [ ] No new tags → workflow no-ops cleanly with exit 0
- [ ] Workflow doesn't leak ARTIFACTS_PAT in any log
- [ ] Production publish (on next real `pnpm cs:publish`) triggers docs-publish automatically and lands in main

---

## Risks and Mitigation

| Risk                                                            | Mitigation                                                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `workflow_run` filter not matching expected event payload       | Test via `workflow_dispatch` first; iterate filter until `workflow_run` works                  |
| Token scope insufficient (PAT can't push to artifacts)          | Use fine-grained PAT with contents:write to seedcord/artifacts only; documented in DOCS_SYSTEM |
| Race between two simultaneous publishes (unlikely but possible) | `concurrency.group: docs-publish-<ref>` + `cancel-in-progress: false` serializes               |
| Index.json conflict because two tags published in same minute   | The script reads-then-writes; if conflict, retry with backoff                                  |
| Workflow runs against historical PR's tags (workflow_run quirk) | Filter on branches=[main] inside trigger                                                       |
| `workflow_run` filter not matching expected event payload       | Test via `workflow_dispatch` first; iterate filter until `workflow_run` works                  |
| Token scope insufficient (PAT can't push to artifacts)          | Use fine-grained PAT with contents:write to seedcord/artifacts only; documented in DOCS_SYSTEM |
| Race between two simultaneous publishes (unlikely but possible) | `concurrency.group: docs-publish-<ref>` + `cancel-in-progress: false` serializes               |
| Index.json conflict because two tags published in same minute   | The script reads-then-writes; if conflict, retry with backoff                                  |
| Workflow runs against historical PR's tags (workflow_run quirk) | Filter on branches=[main] inside trigger                                                       |

---

## Related TODOs

- Blocked by: TASK-08 (composite actions), TASK-14 (scoped extraction), TASK-18 (seed script + index baseline exists)
- Blocks: TASK-20 (Vercel deploy depends on artifacts repo having content)

---

## Notes

- **Complexity:** High (CI + cross-repo + token mgmt)
- **Files affected:** 2 new
- **Touches published packages:** No
- **Estimated wall-clock:** 6-10 hours (most is testing iteration)
