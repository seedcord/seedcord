# TODO 08: CI cleanup — composite actions + tsx install once

## Overview

`TASKS.md` item 5: the docs-related CI is "so long and ugly." Two specific complaints:

1. `tsx` is installed per-step via `npx tsx` instead of once at the top of the job.
2. Repeated logic across jobs should live in composite actions in `.github/actions/`.

This task ALSO sets up the skeleton for the docs-publish workflow (TASK-19) by creating the composite actions the workflow will use. The actual workflow YAML lands in TASK-19.

## Goals

1. **One `tsx` install per workflow** — at the top, not per step. Use `pnpm install` (which installs the workspace `tsx`) or `npm i -g tsx` once. Drop `npx tsx`.
2. **Composite actions for repeated CI pieces**:
    - `.github/actions/setup` (probably exists; audit)
    - `.github/actions/turbo-cache` (exists)
    - `.github/actions/docs-extract` (exists; audit)
    - **NEW**: `.github/actions/setup-tsx` — single setup step for tsx (install once)
    - **NEW**: `.github/actions/extract-single-package-docs` — scoped docs extraction used by the docs-publish workflow (TASK-19)
    - **NEW**: `.github/actions/commit-to-artifacts-repo` — git push to `seedcord/artifacts` with appropriate auth (uses `ARTIFACTS_PAT` from repo secrets)

3. **Audit existing workflows** for any `npx tsx` calls; replace.

---

## Files to Change

### Files to CREATE

- `.github/actions/setup-tsx/action.yml` — single tsx install step
- `.github/actions/extract-single-package-docs/action.yml` — scoped extraction (consumed by TASK-19)
- `.github/actions/commit-to-artifacts-repo/action.yml` — push to artifacts repo

### Files to MODIFY

- `.github/workflows/publish.yml` — drop duplicated `pnpm/action-setup@v4` and `actions/setup-node@v6` invocations (currently appears twice in `npm-publish` job); use composite or just dedupe
- `.github/workflows/tests.yml` — confirm uses composites
- `.github/actions/docs-extract/action.yml` — audit for `npx tsx`; switch to `pnpm exec tsx` or remove if redundant
- Any workflow calling `npx tsx` → switch to `pnpm exec tsx` (so it uses the workspace-installed tsx, no global install)

---

## Implementation Approach

### Step 1 — Audit current state

```sh
rg "npx tsx" .github/
rg "actions/setup-node" .github/workflows/
rg "pnpm/action-setup" .github/workflows/
```

Note the duplicate `setup-node` + `pnpm/action-setup` in `publish.yml`'s `npm-publish` job (visible in STATE.md context).

### Step 2 — Build composite actions

#### `.github/actions/setup-tsx/action.yml`

```yaml
name: 'Setup tsx'
description: 'Install tsx once per job (uses workspace install)'
inputs:
    node-version:
        description: 'Node.js version'
        required: false
        default: '24'
runs:
    using: 'composite'
    steps:
        - name: Use pnpm-managed tsx
          shell: bash
          run: |
              echo "tsx available via: pnpm exec tsx"
              pnpm exec tsx --version
```

If the project prefers a global tsx for some reason, swap to `npm i -g tsx` once here. But `pnpm exec tsx` is cleaner — uses the workspace pin.

#### `.github/actions/extract-single-package-docs/action.yml`

```yaml
name: 'Extract single-package docs'
description: 'Runs the docs-generator scoped to one package + version (used by docs-publish workflow)'
inputs:
    package:
        description: 'Workspace package name (e.g. @seedcord/utils)'
        required: true
    source-path:
        description: 'Path to checkout source (e.g. packages/utils after git checkout <tag>)'
        required: true
    output-dir:
        description: 'Where to write the generated project.json'
        required: false
        default: './generated'
runs:
    using: 'composite'
    steps:
        - name: Extract scoped docs
          shell: bash
          run: |
              pnpm --filter @seedcord/docs-generator run smoke \
                  -o "${{ inputs.output-dir }}" \
                  -p "${{ inputs.source-path }}" \
                  --package "${{ inputs.package }}"
```

> Note: the `--package` flag isn't on the generator yet — that's TASK-14. This composite assumes 14 is done before the workflow that uses it. Mention in the workflow PR commit.

#### `.github/actions/commit-to-artifacts-repo/action.yml`

```yaml
name: 'Commit to artifacts repo'
description: 'Pushes a directory of files to seedcord/artifacts under a specified path'
inputs:
    files-dir:
        description: 'Local dir containing files to commit'
        required: true
    target-path:
        description: 'Path inside seedcord/artifacts (e.g. packages/utils/releases/0.8.4)'
        required: true
    commit-message:
        description: 'Commit message body'
        required: true
    branch:
        description: 'Branch to push to (default: main; use dev-pipeline-test for testing)'
        required: false
        default: 'main'
    pat:
        description: 'Personal access token with contents:write to seedcord/artifacts'
        required: true
runs:
    using: 'composite'
    steps:
        - name: Clone artifacts repo
          shell: bash
          env:
              ARTIFACTS_PAT: ${{ inputs.pat }}
          run: |
              git clone --branch "${{ inputs.branch }}" \
                  "https://x-access-token:${ARTIFACTS_PAT}@github.com/seedcord/artifacts.git" \
                  /tmp/artifacts
        - name: Stage + commit
          shell: bash
          run: |
              mkdir -p "/tmp/artifacts/${{ inputs.target-path }}"
              cp -R "${{ inputs.files-dir }}"/. "/tmp/artifacts/${{ inputs.target-path }}/"
              cd /tmp/artifacts
              git config user.name 'seedcord-bot'
              git config user.email 'bot@seedcord.dev'
              git add "${{ inputs.target-path }}"
              if git diff --cached --quiet; then
                  echo "No changes for ${{ inputs.target-path }}; skipping commit"
                  exit 0
              fi
              git commit -m "${{ inputs.commit-message }}"
              git push origin "${{ inputs.branch }}"
```

### Step 3 — Dedupe publish.yml

Per `STATE.md` excerpt, `publish.yml`'s `npm-publish` job has `pnpm/action-setup@v4` + `actions/setup-node@v6` invoked twice. Remove the second invocation. Move setup steps before the changesets step.

### Step 4 — Drop `npx tsx`

Replace every `npx tsx ...` with `pnpm exec tsx ...` in workflow files.

### Step 5 — Verify CI

Push a no-op commit on a branch and observe the workflow runs cleanly.

### Step 6 — Commit

```sh
git add .github/
git commit -m "ci: composite actions + dedupe + use pnpm exec tsx instead of npx"
```

Changeset: none.

---

## Acceptance Criteria

- [ ] No `npx tsx` invocations remain in `.github/`
- [ ] No duplicated `pnpm/action-setup` / `setup-node` steps in any single job
- [ ] 3 new composite actions exist under `.github/actions/`
- [ ] CI runs green for the test push

---

## Risks and Mitigation

| Risk                                                                                  | Mitigation                                                                                    |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Composite action input names drift from what TASK-19 expects                          | TASK-19 reads this file as the contract; if action signature must change, update both         |
| Removing duplicate setup-node breaks downstream steps that relied on a specific order | Run the dedupe + workflow test on a feature branch before merging                             |
| `ARTIFACTS_PAT` secret not yet configured                                             | Document the secret requirement in DOCS_SYSTEM (TASK-21); workflow gracefully fails if absent |

---

## Related TODOs

- Blocked by: TASK-03 (Node bump may affect workflow node version)
- Blocks: TASK-19 (publish workflow consumes these composites)

---

## Notes

- **Complexity:** Medium
- **Files affected:** 3 new + 2-3 modified in .github/
- **Touches published packages:** No
- **Estimated wall-clock:** 2-3 hours
