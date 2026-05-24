# TODO 10: packages/cli code-quality fixes

## Overview

Apply `.vscode/audits/QUALITY-cli.md` punch list. **37 findings: 8 HIGH, 22 MEDIUM, 7 LOW + 8 test gaps.**

## Goals

1. **All HIGH fixed.** Notably:
    - H1 `SIGINT`/`SIGTERM` handler leak in `DevRunner.ts:103-112` + `DevCommand.ts:56-58` (unbounded handlers per dev cycle → max-listener warning + race)
    - H2 Command injection in `TscRunner.ts:26-30` (`shell: true` + user-supplied `tsconfig` path)
    - H3 Detached error handling in `DevCommand.ts:36-49` (`void this.runner.run().then().catch()` swallows rejections; races `process.exit`)
    - Honourable: file-wide `eslint-disable no-unnecessary-condition` in `DevRunner.ts:1` (AGENTS.md explicitly forbids file-wide disables)
2. **MEDIUM fixed in same pass.**
3. **Test gaps filled** for HMR plumbing + handler-management invariants (no double-register on restart, signal-handler removed on shutdown).

## Source of truth

`.vscode/audits/QUALITY-cli.md`. Read it before starting.

---

## Files to Change

The audit cites each finding's `file:line`. Top hotspots:

- `packages/cli/src/dev/DevRunner.ts` — H1 (signal handlers), file-wide disable
- `packages/cli/src/dev/DevCommand.ts` — H1 (signal handlers), H3 (detached promise)
- `packages/cli/src/dev/TscRunner.ts` — H2 (command injection)
- Various Ink components — React 19 antipatterns (forwardRef, useContext vs use)
- Public exports likely flagged for demotion to `internal.index.ts`

---

## Implementation Approach

### HIGH fixes — sequencing

1. **H2 first (security):** TscRunner command injection — switch to `spawn` with `shell: false` and an args array; sanitize / validate the tsconfig path against a regex (`^[a-zA-Z0-9._/-]+\.json$`).
2. **H3 second (correctness):** DevCommand detached promise — replace `void runner.run().then().catch()` with `await runner.run()` inside an outer try/catch that has well-defined exit-code mapping. Remove the race against `process.exit`.
3. **H1 third (resource lifecycle):** Single signal-handler registration in `DevCommand`; pass the handler down to `DevRunner` instead of letting DevRunner register its own. Use `AbortController` if appropriate.
4. **File-wide disable removal:** Delete the `eslint-disable no-unnecessary-condition` header in `DevRunner.ts:1`; fix the actual conditions that triggered it. If a single line needs the suppression, scope inline with a justification.

### Commit groups

```
fix(cli): TscRunner command injection (shell:true + user-supplied path)
fix(cli): DevCommand detached promise error handling + exit code mapping
fix(cli): single signal-handler registration on dev cycle, remove leak
refactor(cli): remove file-wide eslint disable in DevRunner; fix actual conditions
fix(cli): React 19 antipatterns batch (use() vs useContext, forwardRef → ref-as-prop)
refactor(cli): public API surface — demote internal exports per audit
tests(cli): handler lifecycle + HMR teardown invariants
```

---

## Acceptance Criteria

### Functional

- [ ] `seedcord dev` runs without max-listener warning after 10+ restarts
- [ ] `tsx` cannot be coerced into running arbitrary shell via `tsconfig` path
- [ ] Dev cycle exits cleanly on SIGINT (no zombie processes; no race on exit code)
- [ ] CI green for `packages/cli`
- [ ] No file-wide `eslint-disable` in the package

### Code Quality

- [ ] `pnpm -C packages/cli lint:fix && tc && test` exits 0 errors / 0 warnings / 100% passing
- [ ] No new `as any` / `as unknown as T`
- [ ] No new file-wide eslint-disable

### Publishing

- [ ] Changeset: patch on `@seedcord/cli` (behavior fixes, not API drift)
- [ ] If H2 is judged a security fix, mention in changeset body — users on prior versions should bump

---

## Testing Requirements

- Unit test for the new signal-handler-aware DevRunner shape: register-then-shutdown cleans up
- Unit test for TscRunner argument escaping: arbitrary characters in tsconfig path don't reach shell
- Unit test for DevCommand exit-code mapping: rejected runner → exit 1
- Per audit "Test gaps" section: 8 additional tests on HMR + handlers

---

## Risks and Mitigation

| Risk                                                               | Mitigation                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Removing file-wide disable surfaces 20+ legitimate findings        | Triage: keep the eslint rule, fix root causes; if rule is wrong for the file, override per-line with justification |
| Signal-handler refactor changes dev UX (e.g. double-^C now needed) | Mention in changeset; users typically don't rely on this                                                           |
| TscRunner sanitization rejects valid paths (e.g. with spaces)      | Allow `\s` in regex; test with realistic seedcord.config.ts paths                                                  |
| ink 7 (TASK-05) lands between this task and merge                  | Re-run audit findings against ink 7 surface; some may move                                                         |

---

## Related TODOs

- Blocked by: TASK-03 (TS 6 + typescript-eslint may surface new findings), TASK-05 (ink 7 bump may overlap with React-component refactors here)
- Blocks: nothing critical

---

## Notes

- **Complexity:** Medium-high (security fix + lifecycle invariants)
- **Files affected:** ~10-20 in packages/cli/src
- **Touches published packages:** Yes — `@seedcord/cli` patch (or minor if behavior visibly changes)
- **Estimated wall-clock:** 4-6 hours
