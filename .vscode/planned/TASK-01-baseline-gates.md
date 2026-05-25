# TODO 01: Baseline gates clean + lockfile snapshot

## Overview

Run the full quality gate suite in the current tree state, snapshot any failures (so dep-bump regressions are distinguishable from latent bugs), and capture lockfile + smoke output baselines.

## Goals

1. **Confirm green or document red:** Every workspace gate (`pnpm prePush`) either passes, or every failure is captured to `.vscode/audits/BASELINE-2026-05-24.md` with `file:line` + reproduction command. We need to know what already breaks before we touch deps.
2. **Lockfile snapshot:** Capture `pnpm-lock.yaml` SHA and `pnpm list --depth=0` for every package so we can diff after each major bump in Phase 1.
3. **Smoke baseline:** `pnpm docs:smoke` produces samples; check them into baseline doc for regression comparison.

---

## Files to Change

### Files to CREATE

1. `.vscode/audits/BASELINE-2026-05-24.md` — the baseline report (gate results + any failures)

### Files to MODIFY

None. This is a read-only diagnostic task.

---

## Implementation Approach

### Step 1 — Fresh install

```sh
pnpm install --frozen-lockfile
```

If `--frozen-lockfile` complains, **stop and investigate**. The lockfile drifting from `package.json` before any bumps is itself a finding.

### Step 2 — Run each gate, capture output

```sh
pnpm build       > /tmp/baseline-build.log    2>&1; echo "build: $?"
pnpm tc          > /tmp/baseline-tc.log       2>&1; echo "tc: $?"
pnpm lint:fix    > /tmp/baseline-lint.log     2>&1; echo "lint:fix: $?"
pnpm test        > /tmp/baseline-test.log     2>&1; echo "test: $?"
pnpm docs:smoke  > /tmp/baseline-smoke.log    2>&1; echo "docs:smoke: $?"
```

Don't combine with `&&` — we want every gate's status independently.

### Step 3 — Mock bot smoke

```sh
timeout 30 pnpm -C mock dev 2>&1 | tee /tmp/baseline-mock.log
```

30s is enough to verify the bot logs in / errors out cleanly. Capture the trace either way. Kill via `^C` after the bot is observed running (or after timeout).

### Step 4 — Lockfile + dep snapshot

```sh
shasum -a 256 pnpm-lock.yaml > /tmp/baseline-lockfile.sha
pnpm list --depth=0 --recursive --json > /tmp/baseline-deps.json
```

### Step 5 — Write baseline doc

Populate `.vscode/audits/BASELINE-2026-05-24.md` with this template (replace `<…>`):

```markdown
# Baseline — feat/better-api-extraction @ <commit hash>

**Date:** <date>
**Lockfile SHA:** <sha>

## Gate results

| Gate                           | Exit          | Notes              |
| ------------------------------ | ------------- | ------------------ |
| `pnpm build`                   | <0 / N>       | <one-line summary> |
| `pnpm tc`                      | <0 / N>       | <one-line summary> |
| `pnpm lint:fix`                | <0 / N>       | <one-line summary> |
| `pnpm test`                    | <0 / N>       | <one-line summary> |
| `pnpm docs:smoke`              | <0 / N>       | <one-line summary> |
| `pnpm -C mock dev` (30s smoke) | <pass / fail> | <one-line summary> |

## Pre-existing failures (if any)

### <gate>

- `file:line` — <one-line diagnosis>
- ...

## Notes

- Lockfile drifted: <yes / no>
- Smoke samples differ from prior commit: <yes / no — diff debugging/samples/>
```

If any gate fails, **DO NOT auto-fix as part of this task**. The fix belongs to its own task (likely TASK-09/10/11 quality work, or its own bug task). Just record it.

### Step 6 — Commit baseline

```sh
git add .vscode/audits/BASELINE-2026-05-24.md
git commit -m "chore: baseline gate results before dep bump pass"
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] Baseline doc exists at `.vscode/audits/BASELINE-2026-05-24.md`
- [ ] Every gate's exit code recorded
- [ ] Lockfile SHA captured
- [ ] If any gate red: every failure has `file:line` + reproduction command

### Code Quality

- [ ] No source code modified
- [ ] No deps changed
- [ ] No tests added or skipped

### Publishing

- [ ] N/A — diagnostic task

---

## Testing Requirements

### Validation

- The baseline doc captures the truth as of this commit. There's nothing to test beyond "ran the gates."

---

## Risks and Mitigation

| Risk                                                   | Mitigation                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| A gate has been red for weeks and we forgot            | The baseline doc surfaces it. Fix in the appropriate task.        |
| Smoke samples reveal silent regressions vs main        | Diff `debugging/samples/` against `next` branch's last extraction |
| Lockfile drift suggests we already need `pnpm install` | Fix lockfile first; don't bundle into this baseline task          |
| Smoke samples reveal silent regressions vs main        | Diff `debugging/samples/` against `next` branch's last extraction |
| Lockfile drift suggests we already need `pnpm install` | Fix lockfile first; don't bundle into this baseline task          |

---

## Related TODOs

- Precedes everything in Phase 1
- Blocks every other TASK until done

---

## Notes

- **Complexity:** Low
- **Files affected:** 1 new (.vscode/audits/BASELINE-2026-05-24.md)
- **Touches published packages:** No
- **Estimated wall-clock:** 15-30 min

---

## Handoff

- 2026-05-24 — completed by Claude Opus on sub-branch `chore/dep-bump-batch-01-05`. Commit `0c9b859a`. All primary gates green; mock-dev surfaced 2 pre-existing issues recorded in BASELINE doc (React-key dup → TASK-10; Ink raw-mode → env-only/CI ownership).
