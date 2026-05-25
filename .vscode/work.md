# SESSION KICKOFF — `feat/better-api-extraction` implementation

> You are a fresh Opus session. Read this top-to-bottom before doing anything. The plan was authored in a previous session and Phase 0 + Phase 1 + TASK-02.7 + TASK-08.5 (plus partial TASK-06 / TASK-08) have already landed. You are picking up from there. **Do not re-plan unless the user asks.** Pick tasks per the user's instruction, grill them on the specific task's design, then plan-mode → execute → commit.

---

## You are here

- **Repo:** `/Users/dhruv/Desktop/seedcord/seedcord`
- **Branch:** `feat/better-api-extraction` (single mega-PR; alpha cadence; user is solo dev)
- **PR target:** `next` (releases happen off `main`)
- **Open PR:** #131 (draft) — `feat: better api extraction`
- **State doc:** [`.vscode/STATE.md`](./STATE.md) — read it for the project-wide picture if the user hasn't framed the task
- **Plan doc:** [`.vscode/planned/MASTER_PLAN.md`](./planned/MASTER_PLAN.md) — 21 official tasks + TASK-02.7 (inserted). **This is your authoritative source for what to work on next** including current status per task.
- **Templates:** [`.vscode/templates/`](./templates/) — `MASTER_PLAN_TEMPLATE.md`, `TASK_PLAN_TEMPLATE.md`
- **Agent rules:** [`AGENTS.md`](../AGENTS.md) — non-negotiable; read it before writing code
- **Ecosystem blockers:** [`.vscode/notes/ECOSYSTEM_BLOCKERS_2026-05-24.md`](./notes/ECOSYSTEM_BLOCKERS_2026-05-24.md) — local-only (gitignored); explains what bumps were deferred and why
- **Scratch / visual checkpoints:** `.vscode/scratch/ui-feedback.md` — frontend-iteration protocol scratch file. Overwrite the body per checkpoint, keep the header.

---

## Status — what's done, what's next

| Task                                                       | Status                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| TASK-01 baseline                                           | ✅                                                                                                                        |
| TASK-02 catalog (strict 2+ rule, 4 buckets)                | ✅                                                                                                                        |
| **TASK-02.7 tsup → tsdown migration** (inserted mid-batch) | ✅                                                                                                                        |
| TASK-03 TS ecosystem bump                                  | ✅ — except **ESLint 10 deferred** (blocked by `eslint-plugin-react@7.37.5`; retry when upstream ships v8 / compat patch) |
| TASK-04 frontend bump                                      | ✅                                                                                                                        |
| TASK-05 domain bump                                        | ✅                                                                                                                        |
| TASK-06 devtools                                           | 🟡 — `eslint-plugin-react-compiler` RC wired in apps/docs; react-refresh stays N/A (Vite-only)                            |
| TASK-07 scripts/ tooling                                   | ⏳ Not started                                                                                                            |
| TASK-08 CI cleanup                                         | 🟡 — pin bumps + publish.yml dedup landed; composite actions already in place                                             |
| TASK-08.5 knip + react-doctor                              | ✅ — scripts only, NOT on prePush (deliberate run per cancrops)                                                           |
| TASK-09 apps/docs quality                                  | ⏳ Not started; audit + tool-reconciliation sections ready in `.vscode/audits/QUALITY-apps-docs.md`                       |
| TASK-10 cli quality                                        | ⏳ Not started; `.vscode/audits/QUALITY-cli.md` ready                                                                     |
| TASK-11 framework quality                                  | ⏳ Not started; `.vscode/audits/QUALITY-framework.md` ready                                                               |
| TASK-12 → TASK-21                                          | ⏳ Not started (Phases 4–7)                                                                                               |

**Likely next batches:** TASK-07 (scripts), TASK-09/10/11 (quality fixes — can parallelize). Phase 4 (URL spec + docs engine refactor) starts after quality.

---

## Workflow for this session

1. **User names task(s).** "let's do TASK-09" or "TASK-12 + TASK-13 together." Group of 1–3 tasks is the norm.
2. **Read the task file(s):** `.vscode/planned/TASK-NN-*.md`. Each has acceptance criteria, risks, file inventory, sequencing.
3. **Read referenced artifacts:**
    - Dep-bump tasks → `.vscode/docs/DEP_RESEARCH_*.md` + `DEP_BUMP_RESEARCH.md`
    - Quality-fix tasks → `.vscode/audits/QUALITY-*.md` (HIGH/MEDIUM/LOW + tool-reconciliation sections)
    - URL impl task → `.vscode/docs/URL_SPEC.md`
4. **Invoke `/grill-me`** if anything is ambiguous about the task's design. The user expects to be grilled per-task.
5. **Enter plan mode** (`ExitPlanMode` at the end). Concrete step-by-step plan. Use `AskUserQuestion` for crisp design forks.
6. **Implement.** Per AGENTS.md: edit specific files, run `pnpm -C <pkg> lint:fix && tc && test` after every chunk, surface ambiguities as questions in `.vscode/scratch/ui-feedback.md` for visual checkpoints.
7. **Add changesets** for any task touching a published package's surface. Each task file's "Publishing" section calls out the changeset requirement.
8. **Commit.** Conventional message (lowercase subject, ≤100 chars). Multi-commit per task is fine. GPG signing required (`dangerouslyDisableSandbox: true` on commit Bash calls is pre-approved).
9. **Update MASTER_PLAN status tracker** when each task completes — mark `✅ Completed` with commit SHA + date.

---

## Locked decisions (do NOT re-grill)

These came from the original planning session OR were locked during the 2026-05-24/25 dep-bump batch. Surface explicitly ("you locked X as Y") before revisiting.

| Topic                                                                                  | Decision                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PR scope                                                                               | Single PR; alpha cadence justifies large scope                                                                                                                                                               |
| v1.0 framework blockers (#101 ComponentsV2, #106 multi-handler, #111 typed custom-ids) | Out of scope — separate branches each                                                                                                                                                                        |
| Artifacts pipeline                                                                     | Full implementation including CI/CD, `seedcord/artifacts` repo, jsDelivr fetch                                                                                                                               |
| Dep risk                                                                               | Chase latest stable; skip if security advisory ≥ MEDIUM; cancrops's pins are a known-good floor, not a ceiling                                                                                               |
| **Catalog scope**                                                                      | Strict AGENTS.md 2+ rule: only deps appearing in 2+ package.json files get catalogued (plus `peer:` bucket)                                                                                                  |
| **Catalog version shape**                                                              | Caret ranges (`^X.Y.Z`) so published peerDeps/deps are ranges, not exact pins                                                                                                                                |
| **pnpm version**                                                                       | 11.3.0 (in `package.json` packageManager + CI `pnpm/action-setup` pins)                                                                                                                                      |
| **`minimumReleaseAge` policy**                                                         | Active — KEEP. Reject deps published < 24h (supply-chain hygiene). Pin specific deps if needed (e.g., `ink: 7.0.3` literal to avoid 7.0.4 churn) or add to `minimumReleaseAgeExclude` (auto-managed by pnpm) |
| **`confirm-modules-purge`**                                                            | `false` in `.npmrc` (non-TTY-friendly; pnpm 11 default would otherwise prompt and abort)                                                                                                                     |
| **Validation strictness**                                                              | INCREDIBLY strict. Don't suppress lint/knip/react-doctor findings without a justification comment. Real findings → fix or document in audit. Deprecation warnings → fix (don't silence)                      |
| **Visual verification**                                                                | `.claude/skills/frontend-iteration` — apply to any user-eye verification (UI smoke, CLI render, mock smoke, docs:smoke). End-turn + scratch file + wait for `continue`                                       |
| **Worktree bisects**                                                                   | When hypothesis-testing, USE worktrees (don't mutate HEAD speculatively). `git worktree add $TMPDIR/seedcord-<hypothesis> <ref>`                                                                             |
| Code-quality sweep                                                                     | Done — audits in `.vscode/audits/` ready for fixes (TASK-09/10/11). Per-audit `## Tool reconciliation` sections list knip + react-doctor findings                                                            |
| `mock/`                                                                                | Dep bump yes; quality sweep no                                                                                                                                                                               |
| `scripts/`                                                                             | Stay loose; add root `lint:scripts` + `tc:scripts` (TASK-07)                                                                                                                                                 |
| Plan files                                                                             | `.vscode/planned/MASTER_PLAN.md` + `TASK-NN-*.md`                                                                                                                                                            |
| Research outputs                                                                       | `.vscode/docs/` + `.vscode/audits/`                                                                                                                                                                          |
| Pipeline grain                                                                         | Fine — one concern per task                                                                                                                                                                                  |
| URL fix                                                                                | `URL_SPEC.md` is the contract; TASK-12 implements                                                                                                                                                            |
| Search/nav scope                                                                       | Selected (pkg, version) only                                                                                                                                                                                 |
| Artifacts repo                                                                         | Exists empty + private; user has admin; pipeline testing on `dev-pipeline-test` branch then deleted                                                                                                          |
| `@seedcord/tsup-config` on npm                                                         | Orphaned post-merge; user `npm deprecate`s manually. New name `@seedcord/tsdown-config` is private                                                                                                           |
| TypeScript peer dep on every published pkg                                             | Keep on all (informational peer warning; range now `^6.0.3` so consumers have latitude)                                                                                                                      |
| `importHelpers`                                                                        | `false` — target is `esnext`, very few helpers actually need emitting; `tslib` would be unnecessary runtime cost for consumers                                                                               |
| react-compiler ESLint plugin                                                           | RC but actively maintained; OPTED IN; wired in apps/docs                                                                                                                                                     |

---

## Task dependency graph (don't break this order)

```
✅ 01 baseline
   ✅ 02 catalog reorg
      ✅ 02.7 tsdown migration (inserted)
      ✅ 03 (TS eco)  ✅ 04 (FE eco)  ✅ 05 (domain)   ← parallel branches; commit serially
         🟡 06 eslint compiler (RC wired)
      ⏳ 07 scripts tooling   🟡 08 CI cleanup (partial)       ← can do alongside or solo
         ✅ 08.5 knip + react-doctor
            ⏳ 09 (apps/docs)  ⏳ 10 (cli)  ⏳ 11 (framework) quality      ← parallel
               ⏳ 12 URL spec impl
                  ⏳ 13 lib/docs cleanup
                     ⏳ 14 generator scoped
                        ⏳ 15 engine index.json
                           ⏳ 16 picker + version dropdown
                              ⏳ 17 cross-pkg new tab + scoped search
                                 ⏳ 18 seed-artifacts
                                    ⏳ 19 publish workflow
                                       ⏳ 20 Vercel readiness
                                          ⏳ 21 DOCS_SYSTEM.md (last)
```

If the user picks a task whose blockers aren't done, **flag it before starting**.

---

## Non-negotiable rules (from AGENTS.md — read the full doc)

- **No `any` in production code** — use `unknown` + type guards
- **No `as unknown as T` double casts** — fix the declaration or add a type guard
- **No file-wide `eslint-disable`** — inline + justification only
- **No commented-out code** — delete or fix
- **No silenced deprecation warnings** — treat as errors and fix
- **`pnpm -C <pkg> lint:fix && tc && test`** after every chunk (lint:fix, never plain lint)
- **`git mv` for file moves** to preserve history
- **`pnpm add` / `pnpm update` to add/bump deps** (no manual lockfile edits; no manual package.json edits if a pnpm command can do it)
- **Workspace catalog for shared deps** (`pnpm-workspace.yaml`); use carets (`^X.Y.Z`) not literals
- **`Note for Agent:`** comments in code (deliberately-failing type/lint errors) are intentional — read + honor + remove when done

## Commit conventions (this repo)

- **Conventional commits, lowercase subject, ≤100 chars** (commitlint enforces). Wrap long context in the body.
    - ✓ `chore(deps): bump TS 5.9 → 6.0`
    - ✗ `chore(deps): Bump TS to 6.0`
    - ✗ Subject lines that span > 100 chars (commitlint hard reject)
- **Conventional commit types accepted:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `tests`, `build`, `ci`, `chore`, `revert`, `types`, `nit`
- **GPG signing required** — keyring isn't reachable from sandbox. Use `dangerouslyDisableSandbox: true` on the commit Bash call (pre-approved).
- **Pre-commit hook runs lint-staged** — re-formats files and re-stages. Expected; not an error.
- **Pre-push hook runs `pnpm prePush`** — `build && tc && lint && test`. Don't bypass with `--no-verify` unless the user explicitly asks.

---

## Common pitfalls (this batch's lessons + planning-session lessons)

### pnpm 11

- **`minimumReleaseAge` will reject fresh deps** (default < 24h). When `pnpm install` complains, either pin to an older patch (preferred) or pnpm auto-adds the version to `minimumReleaseAgeExclude` in pnpm-workspace.yaml.
- **`pnpm clean --lockfile` runs the policy check FIRST** so it can't undo a poisoned lockfile. If lockfile has a rejected entry: `rm pnpm-lock.yaml && pnpm install` (force fresh resolution).
- **Non-TTY install will abort on the "delete node_modules" prompt** unless `confirm-modules-purge=false` is in `.npmrc` (already set) OR `CI=true` is in env.

### Catalog publishing

- `catalog:X` references in published manifests get expanded to the catalog's literal value. Use caret ranges in the catalog or consumers get exact-pinned peerDeps/deps.
- Verify by `pnpm -C <pkg> pack --pack-destination /tmp/<pkg>` then `tar -xzOf /tmp/<pkg>/*.tgz package/package.json | python3 -c "import json,sys; print(json.load(sys.stdin))"` to inspect the published shape.

### Tailwind 4.3

- Stricter CSS spec adherence. `h-full` on a child of a `max-h-only` parent (no definite parent height) now collapses silently. Fix: give the parent definite height via flex/grid layout, not just a cap.
- pre-existing flaky Sidebar SSR/client class-order hydration mismatch — pre-existing, gets sidebared (`tailwind-merge` or Zustand-race candidate). **Track:** MASTER_PLAN "Discovered during implementation" section. **Owner:** TASK-09.

### Pre-existing scroll-guard bug pattern

- `apps/docs/src/components/layout/sidebar/utils/useSidebarScrollGuards.tsx` used to call `event.stopPropagation()` BEFORE the scrollable-check early-return — wheel events captured and dropped on non-scrolling viewports. Pattern to look for in similar wheel/scroll handlers elsewhere.

### Tsdown

- `@seedcord/tsdown-config` (formerly `@seedcord/tsup-config`) is now PRIVATE. Builds via `tsdown --config-loader tsx` (self-build needs the tsx loader because tsdown can't resolve dir imports).
- Each published package now ships `dist/index.d.mts` + `dist/index.d.cts` (stub re-export). exports map is per-condition: `import.types` → `.d.mts`, `require.types` → `.d.cts`.

### ESLint 10

- Still deferred. `eslint-plugin-react@7.37.5` crashes on ESLint 10's reorganized linter API. Track <https://github.com/jsx-eslint/eslint-plugin-react> for compat release. When ESLint 10 ships: also bump `eslint-config-next` to `^16.2.6+` in same commit (already at 16.2.6 here, so ready).

### Action versions (deferred this batch)

- `actions/checkout` v5 → v6 (latest 6.0.2) and `pnpm/action-setup` v4 → v6 (latest 6.0.8, two majors behind) available. Skipped this batch; bump in a focused CI-hygiene PR.

### Old pitfalls (still apply)

- `MASTER_PLAN` in a commit subject is rejected as Pascal-case. Lowercase or quote in body.
- `tw` template tag in `apps/docs/src/lib/utils.ts:13` has an inverted guard — don't trust it; the audit explains.
- `apps/docs/src/lib/docs/catalog.ts` is hardcoded and gets killed in TASK-16; don't import from it for new code.
- `seedcord/artifacts` repo: private, empty; admin via user PAT. **Don't push to `main` for testing — use `dev-pipeline-test`.**
- `gh` CLI auth keyring may show "invalid" inside sandbox; `gh` works with `dangerouslyDisableSandbox: true`.

---

## When you're done with a session

1. Mark the task(s) complete in `MASTER_PLAN.md`'s status tracker (commit SHA + date)
2. Append a "completed by Claude Opus" line to the task file's Handoff section
3. If anything surfaced that warrants a follow-up, append a "Discovered during implementation" bullet in `MASTER_PLAN.md`
4. **DO NOT overwrite this `work.md`** — append your "what I learned this session" findings under "Session log" below if non-obvious
5. **DO NOT modify `TASKS.md` or `AGENTS.md`** without explicit permission
6. **DO NOT push to remote** unless the user explicitly says so
7. **DO NOT auto-merge** any branch unless the user explicitly says so

---

## Session log

(Append per-session notes here so future-you sees what's already been chewed on. One block per session.)

### Template

```
#### YYYY-MM-DD — TASK-NN <title>
- Implemented: <what>
- Surprised by: <gotcha>
- Followed up with: <new issue or task>
- Commit(s): <sha list>
```

### 2026-05-24/25 — Phase 0 + Phase 1 + TASK-02.7 + TASK-08.5 (sub-branch `chore/dep-bump-batch-01-05`, squashed into `feat/better-api-extraction`)

- **Implemented:** TASK-01 baseline; TASK-02 catalog reorg to strict-2+ rule + `allowBuilds`; TASK-02.7 tsup → tsdown migration (renamed `@seedcord/tsup-config` to `@seedcord/tsdown-config` private; dual `.d.mts`/`.d.cts` exports); TASK-03 TS 6 + ts-eslint 8.59 + eslint-plugin-security 4 + vite 8 + vitest 4.1.7 + tooling tail (ESLint 10 deferred); TASK-04 frontend bumps (react, next, radix, postcss, zustand, tailwind 4.3, marked 18, shiki 4, lucide 1.16 + a11y); TASK-05 domain bumps (discord.js, mongoose, type-fest, typedoc 0.28.19, ink 7, kysely 0.29); partial TASK-06 (react-compiler RC wired in apps/docs); partial TASK-08 (CI pin bumps); TASK-08.5 (knip + react-doctor, scripts only). pnpm self-update to 11.3.0 + `minimumReleaseAge` policy active + `.npmrc` `confirm-modules-purge=false`. Catalog values converted to caret ranges so published peerDeps are sensible.
- **Surprised by:**
    - tsup@8.5.1 unconditionally injects `baseUrl` into DTS build — TS 6 errors with TS5101 deprecation. Blocked TS 6 until tsdown migration.
    - eslint-plugin-react@7.37.5 doesn't run under ESLint 10. No upstream compat release.
    - tailwindcss 4.3 enforces CSS spec strictly — `h-full` inside `max-h-only` parent stops resolving. Fixed via grid layout in `MobilePanelDialog.tsx`.
    - pnpm 11's `minimumReleaseAge` rejected `ink@7.0.4` (< 24h old). Pinned to `7.0.3`.
    - pnpm catalog refs publish as EXACT versions unless catalog uses range syntax. Caret-prefixed every catalog entry.
    - `react-doctor < 0.2.5` didn't resolve `catalog:react` refs (upstream PR #313 fixed it; we use 0.2.5).
    - The `useSidebarScrollGuards.handleWheel` had a pre-existing `stopPropagation` ordering bug — captured + dropped wheel events on non-scrolling viewports. Fixed.
- **Followed up with (in MASTER_PLAN "Discovered" section):** intermittent Sidebar hydration mismatch (TASK-09), cmd-k animation framerate (TASK-09), knip/react-doctor first-run findings (TASK-09/10/11), GitHub Action major versions available (CI hygiene PR), root devDeps dropped this batch (@swc/core, @types/chai, chai, nodemon).
- **Commit(s):** 29 commits on the sub-branch — squash collapses to one on `feat/better-api-extraction`. Visible in git log of feat branch after squash.

---

## What to say in your first message

If the user opens a fresh session by pointing you here, your first message should be terse:

> Read `.vscode/work.md`, `.vscode/STATE.md`, `.vscode/planned/MASTER_PLAN.md`. Which task(s) do you want to work on this session?

Don't dump the locked decisions back at the user. They wrote them. They know.
