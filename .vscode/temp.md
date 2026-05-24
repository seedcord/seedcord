# SESSION KICKOFF — feat/better-api-extraction implementation

> You are a fresh Opus session. Read this top-to-bottom before doing anything. The plan was authored in a previous session; you are picking up implementation. **Do not re-plan.** Pick tasks per the user's instruction, grill them on the specific task's design, then plan-mode → execute → commit.

---

## You are here

- **Repo:** `/Users/dhruv/Desktop/seedcord/seedcord`
- **Branch:** `feat/better-api-extraction` (single mega-PR; alpha cadence; user is solo dev)
- **PR target:** `next` (releases happen off `main`)
- **Open PR:** #131 (draft) — `feat: better api extraction`
- **State doc:** [`.vscode/STATE.md`](./STATE.md) — read it for the project-wide picture if the user hasn't framed the task
- **Plan doc:** [`.vscode/planned/MASTER_PLAN.md`](./planned/MASTER_PLAN.md) — 21 tasks across 7 phases; **this is your authoritative source for what to work on next**
- **Templates:** [`.vscode/templates/`](./templates/) — `MASTER_PLAN_TEMPLATE.md`, `TASK_PLAN_TEMPLATE.md`
- **Agent rules:** [`AGENTS.md`](../AGENTS.md) — non-negotiable; read it before writing code

---

## Workflow for this session

1. **User names task(s).** The user will say "let's do TASK-03" or "TASK-12 + TASK-13 together." Group of 1-3 tasks is the norm.
2. **Read the task file(s).** `.vscode/planned/TASK-NN-*.md`. Each file has acceptance criteria, risks, file inventory, sequencing notes.
3. **Read referenced artifacts:**
    - Dep-bump tasks → `.vscode/docs/DEP_RESEARCH_*.md` + `DEP_BUMP_RESEARCH.md`
    - Quality-fix tasks → `.vscode/audits/QUALITY-*.md`
    - URL impl task → `.vscode/docs/URL_SPEC.md`
4. **Invoke `/grill-me`** if anything is ambiguous about the task's design. The user expects to be grilled per-task — this is the design phase, after planning, before implementation. Use it.
5. **Enter plan mode** (`ExitPlanMode` at the end). Produce a concrete step-by-step plan for the task(s). Use `AskUserQuestion` for crisp design forks.
6. **Implement.** Per AGENTS.md: edit specific files, run `pnpm -C <pkg> lint:fix && tc && test` after every chunk, surface ambiguities as questions in this file (`temp.md`) — append, don't overwrite.
7. **Add changesets** for any task touching a published package's surface. Each task file's "Publishing" section calls out the changeset requirement.
8. **Commit.** Conventional message. Multi-commit per task is fine if logical groupings exist (the task files suggest them). User has GPG signing; commit outside sandbox.
9. **Update MASTER_PLAN status tracker** when each task completes — mark `✅ Completed` with the commit SHA.

---

## Locked decisions (do not re-grill — these were settled in the planning session)

| Topic                                                                                  | Decision                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR scope                                                                               | Single PR; alpha cadence justifies large scope                                                                                                                                                                                              |
| v1.0 framework blockers (#101 ComponentsV2, #106 multi-handler, #111 typed custom-ids) | **Out of scope** — separate branches each                                                                                                                                                                                                   |
| Artifacts pipeline                                                                     | Full implementation including CI/CD, `seedcord/artifacts` repo, jsDelivr fetch                                                                                                                                                              |
| Dep risk                                                                               | Chase latest stable; skip if security advisory ≥ MEDIUM; cancrops's pins are a known-good floor, not a ceiling                                                                                                                              |
| Cross-pkg link                                                                         | Open in new tab                                                                                                                                                                                                                             |
| E2E test definition                                                                    | Full stack + `pnpm prePush` clean + `mock/` bot smokes + `docs:smoke` produces output + manual apps/docs walkthrough per entity kind + artifacts pipeline tested via `workflow_dispatch` on `seedcord/artifacts` `dev-pipeline-test` branch |
| Code-quality sweep                                                                     | Done — audits in `.vscode/audits/` ready for fixes (TASK-09/10/11)                                                                                                                                                                          |
| `mock/`                                                                                | Dep bump yes; quality sweep no                                                                                                                                                                                                              |
| `scripts/`                                                                             | Stay loose; add root `lint:scripts` + `tc:scripts` (TASK-07)                                                                                                                                                                                |
| Plan files                                                                             | `.vscode/planned/MASTER_PLAN.md` + `TASK-NN-*.md`                                                                                                                                                                                           |
| Research outputs                                                                       | `.vscode/docs/`, audit outputs in `.vscode/audits/`                                                                                                                                                                                         |
| Pipeline grain                                                                         | Fine — one concern per task                                                                                                                                                                                                                 |
| URL fix                                                                                | `URL_SPEC.md` is the contract; TASK-12 implements                                                                                                                                                                                           |
| Search/nav scope                                                                       | Selected (pkg, version) only (overrides earlier TASKS.md item 7)                                                                                                                                                                            |
| Artifacts repo                                                                         | Exists empty + private; user has admin; pipeline testing on `dev-pipeline-test` branch then deleted                                                                                                                                         |

If the user asks to revisit one of these, surface it explicitly: "you locked X in the planning session as Y — do you want to revisit?"

---

## Task dependency graph (don't break this order)

```
01 baseline
   → 02 catalog reorg
      → 03 (TS eco)  04 (FE eco)  05 (domain)   ← parallel branches; commit serially
         → 06 eslint cleanup
      → 07 scripts tooling   08 CI cleanup       ← can do alongside 03/04/05
         → 09 (apps/docs)  10 (cli)  11 (framework) quality      ← parallel
            → 12 URL spec impl
               → 13 lib/docs cleanup
                  → 14 generator scoped
                     → 15 engine index.json
                        → 16 picker + version dropdown
                           → 17 cross-pkg new tab + scoped search
                              → 18 seed-artifacts
                                 → 19 publish workflow
                                    → 20 Vercel readiness
                                       → 21 DOCS_SYSTEM.md (last)
```

If the user picks a task whose blockers aren't done, **flag it before starting**.

---

## Non-negotiable rules (from AGENTS.md — read the full doc)

- **No `any` in production code** — use `unknown` + type guards
- **No `as unknown as T` double casts** — fix the declaration or add a type guard
- **No file-wide `eslint-disable`** — inline + justification only
- **No commented-out code** — delete or fix
- **`pnpm -C <pkg> lint:fix && tc && test`** after every chunk (lint:fix, never plain lint)
- **`git mv` for file moves** to preserve history
- **`pnpm add` to add deps** (no manual lockfile edits)
- **Workspace catalog for shared deps** — `pnpm-workspace.yaml` is authoritative
- **`Note for Agent:`** comments in code (deliberately-failing type/lint errors) are intentional — read + honor + remove when done

## Commit conventions (this repo)

- **Conventional commits, lowercase subject.** Commitlint will reject `Pascal-case` or `UPPER-CASE` subjects (learned the hard way in planning session).
    - ✓ `chore(deps): bump TS 5.9 → 6.0`
    - ✗ `chore(deps): Bump TS to 6.0`
    - ✗ `docs(plan): MASTER_PLAN added`
- **Conventional commit types accepted:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `tests`, `build`, `ci`, `chore`, `revert`, `types`, `nit`
- **GPG signing required** — the keyring isn't reachable from sandbox. Either:
    - Use `dangerouslyDisableSandbox: true` on the Bash tool (preferred; user has approved this for commits)
        - Or tell the user to run the commit themselves via `!` prefix
- **Pre-commit hook runs lint-staged** — it will re-format your files and re-stage. That's fine; just don't be confused when prettier touches things.
- **Pre-push hook runs `pnpm tc && pnpm lint && pnpm test`** — don't bypass with `--no-verify` unless the user explicitly asks.

## Common pitfalls (observed in planning session)

- `MASTER_PLAN` in a commit subject is rejected by commitlint as Pascal-case. Lowercase or quote in the body.
- The `tw` template tag in `apps/docs/src/lib/utils.ts:13` has an inverted guard — don't be fooled into thinking it works; the audit explains.
- `apps/docs/src/lib/docs/catalog.ts` is hardcoded and gets killed in TASK-16; don't import from it for new code.
- `docs-engine` and `docs-generator` are both at 0.2.2; package-version assumptions get sketchy fast — read the actual `package.json` per task.
- `seedcord/artifacts` repo lives at `github.com/seedcord/artifacts`, private, empty, admin access via user's PAT. **Don't push to `main` for testing — use `dev-pipeline-test` branch.**
- `gh` CLI auth keyring may show "invalid" inside sandbox; **gh works fine with `dangerouslyDisableSandbox: true`** (the user's keyring just isn't reachable from sandbox).
- Engines floor moves to `node ^22.13.0` as part of TASK-03 (ESLint 10 requirement); don't forget the `engines` bump.

## When you're done with a session

1. Mark the task(s) complete in `MASTER_PLAN.md`'s status tracker (commit SHA + date)
2. Append a one-line "completed by Claude Opus" note to the task file's Handoff section
3. If anything surfaced that warrants a new follow-up issue, append a "discovered" bullet at the bottom of MASTER_PLAN.md
4. **DO NOT** overwrite this `temp.md` — append your "what I learned this session" findings under the section below if non-obvious
5. **DO NOT** modify `TASKS.md` or `AGENTS.md` without explicit permission
6. **DO NOT** push to remote unless the user explicitly says so

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

---

## What to say in your first message

If the user opens a fresh session by pointing you here, your first message should be terse:

> Read `.vscode/temp.md`, `.vscode/STATE.md`, `.vscode/planned/MASTER_PLAN.md`. Which task(s) do you want to work on this session?

Don't dump the locked decisions back at the user. They wrote them. They know.
