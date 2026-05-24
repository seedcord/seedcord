# Master Implementation Plan — `feat/better-api-extraction` (PR #131)

**Project:** seedcord
**Branch:** `feat/better-api-extraction`
**Date Created:** 2026-05-24
**Owner:** dhruv (solo)
**PR target:** `next`

---

## 🎯 PROJECT COMPLETION SUMMARY

**Status:** 🔄 **PLANNING COMPLETE — READY TO IMPLEMENT** (2026-05-24)

**Mission:** Land the 4-month-backlog of work on `feat/better-api-extraction` as a single PR. Functioning, automatically version-managed documentation website with archives and a clean data layer, plus a dependency catch-up, plus a code-quality pass on the React/Ink + framework surfaces.

**Overview of all tasks:**

| Phase | TODO | Task                                                                           | Status         | Blocked by |
| ----- | ---- | ------------------------------------------------------------------------------ | -------------- | ---------- |
| 0     | 01   | Baseline gates clean + lockfile snapshot                                       | ⏳ Not started | —          |
| 1     | 02   | Catalog reorg (cancrops-style buckets)                                         | ⏳ Not started | 01         |
| 1     | 03   | Dep bump: TS ecosystem                                                         | ⏳ Not started | 02         |
| 1     | 04   | Dep bump: frontend ecosystem                                                   | ⏳ Not started | 02         |
| 1     | 05   | Dep bump: domain (discord.js / mongoose / typedoc / ink / commander / winston) | ⏳ Not started | 02         |
| 1     | 06   | Add missing devtools (react-compiler ESLint, react-refresh ESLint)             | ⏳ Not started | 03, 04     |
| 2     | 07   | `scripts/` lint + tc + wire into prePush                                       | ⏳ Not started | 03         |
| 2     | 08   | CI cleanup (composite actions, tsx install once, docs publish skeleton)        | ⏳ Not started | 03         |
| 2     | 08.5 | knip + react-doctor (wire into prePush, reconcile audits)                      | ⏳ Not started | 08         |
| 3     | 09   | apps/docs code-quality fixes (from audit punch list + tool reconciliation)     | ⏳ Not started | 04, 08.5   |
| 3     | 10   | packages/cli code-quality fixes (audit + tool reconciliation)                  | ⏳ Not started | 03, 05, 08.5 |
| 3     | 11   | framework code-quality fixes (audit + tool reconciliation)                     | ⏳ Not started | 03, 05, 08.5 |
| 4     | 12   | URL spec implementation + acceptance tests                                     | ⏳ Not started | 11         |
| 4     | 13   | `apps/docs/lib/docs` cleanup → move engine concerns to `@seedcord/docs-engine` | ⏳ Not started | 12         |
| 4     | 14   | docs-generator: version-aware (`--package`, `--source-path`, `--tag-mode`)     | ⏳ Not started | 13         |
| 4     | 15   | docs-engine: consume `index.json` + jsDelivr fetcher                           | ⏳ Not started | 14         |
| 5     | 16   | apps/docs UI: pkg picker + version dropdown driven by index.json               | ⏳ Not started | 15         |
| 5     | 17   | apps/docs UI: cross-pkg link → new tab + search scoped to selected version     | ⏳ Not started | 16         |
| 6     | 18   | `scripts/seed-artifacts.ts` — seed artifacts repo from existing tags           | ⏳ Not started | 14         |
| 6     | 19   | docs publish workflow (composite action + workflow_run trigger)                | ⏳ Not started | 18         |
| 6     | 20   | Vercel deploy readiness for apps/docs (env contract, build, ISR)               | ⏳ Not started | 19         |
| 7     | 21   | `.vscode/docs/DOCS_SYSTEM.md` — final user-facing system doc                   | ⏳ Not started | 20         |

**Current Verification (2026-05-24, planning-only session):**

- ❓ Build (`pnpm build`): not run since dep bump deferred
- ❓ Typecheck (`pnpm tc`): not run
- ❓ Lint (`pnpm lint:fix`): not run
- ❓ Tests (`pnpm test`): not run
- ❓ `pnpm prePush`: not run

**Run all of these as TASK-01 before starting any implementation.**

**Deliverables (this PR):**

1. Catalog-organized `pnpm-workspace.yaml` matching cancrops's bucket structure.
2. Every dep at latest stable (modulo security holds), changesets recorded for any cross-package surface drift.
3. Code-quality audits applied across apps/docs, packages/cli, and framework packages.
4. Clean, stable, deterministic docs URLs (see `.vscode/docs/URL_SPEC.md`).
5. Version-aware docs generator + engine; archives accessible via dropdown.
6. Artifacts repo seeded with current published tags' `project.json` + `index.json`.
7. Publish workflow that runs on `workflow_run: tests success on main`, scopes the generator per package per new tag, pushes to artifacts repo.
8. Vercel-deployable `apps/docs` reading from artifacts repo via jsDelivr.
9. `.vscode/docs/DOCS_SYSTEM.md` documenting the whole system end-to-end.

---

## Table of Contents

1. [Code Sample Policy](#code-sample-policy)
2. [Decisions Locked During Grilling](#decisions-locked-during-grilling)
3. [Implementation Order + Phase Summaries](#implementation-order)
4. [Dependency Graph](#dependency-graph)
5. [Task Status Tracker](#task-status-tracker)
6. [Handoff Notes](#handoff-notes)
7. [Critical Dependencies](#critical-dependencies)
8. [Parallel Work](#parallel-work)
9. [Out of Scope](#out-of-scope)
10. [Reference Materials Produced](#reference-materials-produced)

---

## Code Sample Policy

⚠️ **CRITICAL: All code samples in task files are SUGGESTIONS ONLY**

Read the task file thoroughly for **what** and **why**. Review code samples to understand the **pattern** and **approach**. Examine the actual codebase to find similar existing patterns. Write new code that follows existing patterns while meeting task requirements. Adapt sample code concepts to match reality.

This applies especially to dep-bump tasks where the migration recipe is based on changelogs that may have been amended since this plan was written. Verify against the latest release notes when starting each task.

---

## Decisions Locked During Grilling

These decisions are non-negotiable for this PR. Re-grill before changing.

| Topic                                                                                  | Decision                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR scope                                                                               | One PR — alpha cadence + 4-month backlog justify large scope                                                                                                                                                                     |
| v1.0 framework blockers (#101 ComponentsV2, #106 multi-handler, #111 typed custom-ids) | **Out of scope** — separate branches                                                                                                                                                                                             |
| Artifacts pipeline                                                                     | **In scope**, full implementation including CI/CD                                                                                                                                                                                |
| Dep risk tolerance                                                                     | Chase latest modulo security advisories ≥ MEDIUM                                                                                                                                                                                 |
| Cross-pkg link UX                                                                      | Open in new tab; current tab anchored to active pkg                                                                                                                                                                              |
| E2E definition                                                                         | Full stack (per-package + workspace `prePush`) + mock bot runs + docs:smoke produces output + apps/docs manual walkthrough per kind + artifacts pipeline tested via `workflow_dispatch` on a test branch in `seedcord/artifacts` |
| Code-quality sweep surfaces                                                            | apps/docs + packages/cli + framework packages                                                                                                                                                                                    |
| `mock/`                                                                                | Dep bump yes, quality sweep no                                                                                                                                                                                                   |
| `scripts/`                                                                             | Stay loose; add root `lint:scripts` + `tc:scripts` wired into `prePush`                                                                                                                                                          |
| Search/nav scope                                                                       | Selected pkg + version only (no cross-version aggregation)                                                                                                                                                                       |
| Artifacts repo state                                                                   | Exists, private, empty, user has admin; test pipeline against `seedcord/artifacts` test branch                                                                                                                                   |
| Session mode for planning                                                              | Plan-only this session; user implements in chunks                                                                                                                                                                                |

---

## Implementation Order

### Phase 0 — Baseline (TASK-01)

**Phase Goal:** Snapshot current state so we know what we broke vs what was already broken.

**What gets done:**

- `pnpm install` clean
- `pnpm prePush` (build + tc + lint + test) — record any pre-existing failures
- `pnpm docs:smoke` — confirm current sample output
- `pnpm -C mock dev` smoke (manual, briefly)
- Snapshot `pnpm-lock.yaml` hash for diff comparison later

**What stays the same:** everything

**Impact:** Establishes the known-good baseline. Without this, dep bump failures are indistinguishable from latent bugs.

---

### Phase 1 — Dep bump + catalog reorg (TASKS 02-06)

**Phase Goal:** Dependency catch-up. 4 months of bumps. Reorganize the workspace catalog to match cancrops's bucket layout. Add the dev tooling we should have (react-compiler ESLint, react-refresh ESLint).

**What gets built:**

- 7-bucket catalog (`deps`, `react`, `frontend`, `testing`, `lint`, `build`, `peer`) — see `.vscode/docs/DEP_BUMP_RESEARCH.md` for the proposed shape
- Every dep on its target version (per per-bucket `DEP_RESEARCH_*.md` files)
- `eslint-plugin-react-compiler` + `eslint-plugin-react-refresh` installed in apps/docs (per cancrops)

**What gets deleted:**

- Duplicate version pins across package.json files (consolidated into catalog entries)
- Catalog drift between root `package.json` devDependencies and per-package usage

**What stays the same:**

- `packages/eslint-config` rule set (separate task if needed — out of scope for dep bump)
- Application logic (no behavior changes from dep bump alone)

**Impact:** Builds will use the latest engines and APIs. Necessary precondition for the apps/docs work (next 16 surface) and the framework work (TS 6 surface).

**Risk:** TS 6 is a major bump. Vite 8 likely. discord.js may be 15 by now. Each major needs a sweep through callers; the research docs catalogue the breakage.

**Sequencing within Phase 1:**

- 02 must precede 03/04/05 (catalog must exist before bumping into it)
- 03/04/05 can run in parallel **branches** but commit serially to manage lockfile conflicts
- 06 follows 03 + 04 (react-compiler needs the right ESLint major)

---

### Phase 2 — Tooling cleanup (TASKS 07, 08)

**Phase Goal:** Cover the gaps the workflow has gotten away with for too long.

**What gets built:**

- `scripts/` runs through ESLint + `tsc --noEmit` via new root scripts (`pnpm lint:scripts`, `pnpm tc:scripts`)
- Both wired into `pnpm prePush`
- CI composite actions de-duplicating the publish + docs-extract pieces
- `tsx` installed once at the top of jobs instead of `npx tsx` per step

**What gets deleted:**

- Inline shell logic in `.github/workflows/publish.yml` that belongs in composites
- `npx tsx` invocations

**Impact:** Faster CI; AGENTS.md-compliant `scripts/` folder.

---

### Phase 3 — Code-quality fixes (TASKS 09, 10, 11)

**Phase Goal:** Apply the subagent audit punch lists. HIGH findings always; MEDIUM where they don't expand scope; LOW deferred unless touched by another task.

**What gets built:**

- Targeted fixes per finding in `.vscode/audits/QUALITY-apps-docs.md`, `QUALITY-cli.md`, `QUALITY-framework.md`
- Missing tests for highlighted coverage gaps where in scope
- Public-API-surface demotions per the audit (move exports to `internal.index.ts` where flagged)

**What gets deleted:**

- Dead code, unused exports identified by the audits
- Inline duplicated logic where a shared helper / token / primitive exists

**What stays the same:**

- Architecture; no rewrites
- Anything LOW that isn't already in a touched file

**Impact:** Codebase quality bar applied; future implementation agents see a clean baseline.

**Note on autonomy:** Each fix is a discrete edit. The implementation agent reads the audit, applies the fix, runs `pnpm -C <pkg> lint:fix && tc && test` and confirms the finding is gone. Iterate per finding, not per file.

---

### Phase 4 — Docs core refactor (TASKS 12, 13, 14, 15)

**Phase Goal:** Make the docs engine + generator version-aware and the URLs clean.

**What gets built:**

- URL spec implementation per `.vscode/docs/URL_SPEC.md` (kill the djb2 hash; strip parent slug from member fragments)
- `apps/docs/src/lib/docs/` audit — engine concerns moved to `@seedcord/docs-engine` (audit identifies what)
- `docs-generator` accepts `--package <name>` + `--source-path <path>` + `--tag-mode` so CI can extract a single package version from a `git checkout <tag>` working tree
- `docs-engine` reads `index.json` (from jsDelivr URL config) and lazily fetches `project.json` files on package/version selection

**What gets deleted:**

- Code in `apps/docs/lib/docs` that duplicates engine logic
- Hardcoded package list in `apps/docs/src/lib/docs/catalog.ts`
- Hardcoded version assumptions across the docs layer

**What stays the same:**

- The general shape of the routes (`/docs/packages/<pkg>/<version>/<kind>/<slug>`)
- The render layer in `apps/docs/src/components/docs/`

**Impact:** Foundation for archives. Single source of truth for URL generation. Generator can be invoked in CI per tag.

---

### Phase 5 — apps/docs UI (TASKS 16, 17)

**Phase Goal:** User-visible features.

**What gets built:**

- Package picker (lists every package in `index.json`)
- Per-package version dropdown with `• latest` decoration on newest stable; prereleases tagged separately
- Cross-pkg links open in new tab (`target="_blank" rel="noopener"`) when the link's target package ≠ the page's current package
- Search and nav scoped to the currently-selected (package, version)

**What stays the same:**

- Render of individual entity pages (Phase 4 already updated the URL/engine surface they consume)

**Impact:** The terminal state of the docs UX is reached.

---

### Phase 6 — Artifacts pipeline (TASKS 18, 19, 20)

**Phase Goal:** Automatic, version-managed documentation publishing.

**What gets built:**

- `scripts/seed-artifacts.ts` — seed `seedcord/artifacts` from every existing tag for every published package. Idempotent. Reads `pnpm-workspace.yaml` for the package list (not hardcoded). Uses `ARTIFACTS_PAT` (passed via env var).
- A new GitHub Actions workflow `.github/workflows/docs-publish.yml` triggered on `workflow_run: completed` from `tests` after `release` succeeds on `main`. Discovers new tags by diffing `git tag` vs the artifacts repo's `index.json`. For each new tag: checkout, run scoped generator, commit `project.json` + update `index.json`, push to artifacts repo.
- Composite actions in `.github/actions/` for the repeated pieces (checkout-and-setup-pnpm-node, extract-single-package-docs, commit-to-artifacts-repo).
- Vercel deployment for apps/docs: env vars contract documented, `next.config.ts` set up for static-friendly build (where possible), ISR strategy where needed.

**What gets deleted:**

- Old hardcoded versions/packages in apps/docs (already handled in Phase 4)

**Impact:** Docs publish themselves. Every new `pnpm cs:publish` tag automatically results in an apps/docs deploy showing the new version.

**Testing protocol:** All workflow_dispatch tests target `seedcord/artifacts`'s `dev-pipeline-test` branch (per user decision); the branch is deleted after the pipeline is proven.

---

### Phase 7 — Documentation (TASK-21)

**Phase Goal:** Write `.vscode/docs/DOCS_SYSTEM.md` covering every operational detail the user needs.

**What's covered:**

- Local development: how to run `pnpm docs:smoke`, what it produces
- Publishing: how a `pnpm cs:publish` triggers the publish workflow → docs publish workflow → artifacts repo update
- Manual override: how to backfill a missing tag, fix a botched extraction, force-republish
- Vercel ops: env vars, redeploy triggers, rollback
- Artifacts repo layout reference
- Index.json schema reference

**Impact:** Future-you (or any other implementor) knows how to operate the system without re-reverse-engineering it.

---

## Dependency Graph

```
              ┌──────────────────────┐
              │ 01 baseline gates    │
              └──────────┬───────────┘
                         │
              ┌──────────▼───────────┐
              │ 02 catalog reorg     │
              └──────────┬───────────┘
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│03 TS eco bump│ │04 FE eco bump│ │05 Domain bump│
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────┬───────┘                │
                ▼                        │
       ┌─────────────────┐               │
       │ 06 add devtools │               │
       └────────┬────────┘               │
                │                        │
       ┌────────▼────────┐      ┌────────▼────────┐
       │07 scripts/ tools│      │08 CI cleanup    │
       └────────┬────────┘      └────────┬────────┘
                │                        │
                │                        ▼
                │            ┌────────────────────────┐
                │            │08.5 knip + react-doctor│
                │            └────────────┬───────────┘
                │                         │
                └────────────┬────────────┘
                             ▼
                ┌────────────────────────┐
                │ 09 apps/docs quality   │
                │ 10 cli quality         │ (parallel; consume audits + tool reconciliation)
                │ 11 framework quality   │
                └────────────┬───────────┘
                             ▼
                ┌────────────────────────┐
                │ 12 URL spec impl       │
                └────────────┬───────────┘
                             ▼
                ┌────────────────────────┐
                │ 13 lib/docs cleanup    │
                └────────────┬───────────┘
                             ▼
                ┌──────────────────────────┐
                │14 generator version-aware│
                └────────────┬─────────────┘
                             ▼
                ┌────────────────────────┐
                │15 engine index.json    │
                └────────────┬───────────┘
                             ▼
                ┌────────────────────────┐
                │16 UI picker + dropdown │
                └────────────┬───────────┘
                             ▼
                ┌────────────────────────┐
                │17 cross-pkg new tab    │
                └────────────┬───────────┘
                             ▼
                ┌────────────────────────┐
                │ 18 seed-artifacts.ts   │
                └────────────┬───────────┘
                             ▼
                ┌────────────────────────┐
                │19 docs-publish workflow│
                └────────────┬───────────┘
                             ▼
                ┌────────────────────────┐
                │ 20 Vercel readiness    │
                └────────────┬───────────┘
                             ▼
                ┌────────────────────────┐
                │ 21 DOCS_SYSTEM.md      │
                └────────────────────────┘
```

---

## Task Status Tracker

(Mirror the top status table here as work progresses. Update STATUS column on each completion.)

| Phase | TODO | Title                                        | Status         | Started | Completed | Commit |
| ----- | ---- | -------------------------------------------- | -------------- | ------- | --------- | ------ |
| 0     | 01   | Baseline gates clean                         | ⏳ Not Started | —       | —         | —      |
| 1     | 02   | Catalog reorg                                | ⏳ Not Started | —       | —         | —      |
| 1     | 03   | Dep bump: TS ecosystem                       | ⏳ Not Started | —       | —         | —      |
| 1     | 04   | Dep bump: frontend                           | ⏳ Not Started | —       | —         | —      |
| 1     | 05   | Dep bump: domain                             | ⏳ Not Started | —       | —         | —      |
| 1     | 06   | Add devtools (react-compiler, react-refresh) | ⏳ Not Started | —       | —         | —      |
| 2     | 07   | scripts/ lint + tc                           | ⏳ Not Started | —       | —         | —      |
| 2     | 08   | CI cleanup + composite actions               | ⏳ Not Started | —       | —         | —      |
| 2     | 08.5 | knip + react-doctor                          | ⏳ Not Started | —       | —         | —      |
| 3     | 09   | apps/docs quality fixes                      | ⏳ Not Started | —       | —         | —      |
| 3     | 10   | packages/cli quality fixes                   | ⏳ Not Started | —       | —         | —      |
| 3     | 11   | framework quality fixes                      | ⏳ Not Started | —       | —         | —      |
| 4     | 12   | URL spec impl + tests                        | ⏳ Not Started | —       | —         | —      |
| 4     | 13   | apps/docs/lib/docs cleanup                   | ⏳ Not Started | —       | —         | —      |
| 4     | 14   | docs-generator version-aware                 | ⏳ Not Started | —       | —         | —      |
| 4     | 15   | docs-engine index.json + jsDelivr            | ⏳ Not Started | —       | —         | —      |
| 5     | 16   | apps/docs picker + version dropdown          | ⏳ Not Started | —       | —         | —      |
| 5     | 17   | apps/docs cross-pkg new tab + search scoping | ⏳ Not Started | —       | —         | —      |
| 6     | 18   | scripts/seed-artifacts.ts                    | ⏳ Not Started | —       | —         | —      |
| 6     | 19   | docs-publish workflow                        | ⏳ Not Started | —       | —         | —      |
| 6     | 20   | Vercel readiness                             | ⏳ Not Started | —       | —         | —      |
| 7     | 21   | DOCS_SYSTEM.md                               | ⏳ Not Started | —       | —         | —      |

**Status Legend:** 🔄 In Progress · ⏳ Not Started / Blocked · ✅ Completed · ❌ Failed / Needs Rework

---

## Handoff Notes

**Instructions for the implementor:** After completing a TODO, copy the per-task handoff template from `.vscode/templates/TASK_PLAN_TEMPLATE.md` into the corresponding `TASK-NN-*.md` file and fill it in.

(Empty — populated as tasks complete.)

---

## Critical Dependencies

⚠️ **DO NOT SKIP OR REORDER — these must be sequential:**

| Violation                                                | Consequence                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Land 03/04/05 before 02                                  | Catalog has nowhere to put the bumped versions; per-package `catalog:peer` / `catalog:deps` references break             |
| Land 12 (URL spec) before 11 (framework quality)         | URL spec touches `mappers.ts` which the framework audit may flag; do the broad cleanup first, then the targeted refactor |
| Land 14 (generator scoping) before 13 (lib/docs cleanup) | Generator changes may invalidate apps/docs imports; cleanup must precede                                                 |
| Land 16/17 before 15                                     | UI consumes the engine surface; engine must support per-version loading first                                            |
| Land 19 (publish workflow) before 18 (seed script)       | Workflow needs a non-empty index.json to diff against; seeding produces that baseline                                    |
| Land 20 (Vercel) before 19 (publish workflow)            | Vercel needs the artifacts repo to actually have content; seed + workflow first                                          |
| Skip 01 (baseline)                                       | You can't tell dep-bump regressions from pre-existing failures                                                           |

---

## Parallel Work

You may parallelize these to save wall-clock time, but commit serially to manage lockfile + changeset conflicts:

- **During Phase 1**: 03, 04, 05 can be developed in parallel worktrees (`.claude/worktrees/03-ts-eco`, etc.). Merge to feature branch in dependency order.
- **During Phase 3**: 09, 10, 11 are independent (different surfaces). Run quality fixes for all three in parallel; commit per surface.
- **During Phase 4**: 12 (URL spec) and 13 (lib/docs cleanup) touch overlapping files (`apps/docs/src/lib/docs/resolveReferenceHref.ts`); do 12 first, then 13.
- **During Phase 6**: 19 (workflow yaml) can be drafted while 18 (seed script) is running. Don't commit 19 until 18 has produced a real index.json to test against.

---

## Out of Scope (explicitly deferred)

Document here so future-you doesn't accidentally pull these in. Track each in its own future PR / branch.

- **#101 / #102 / #103 / #104 ComponentsV2 error handling** — framework breaking change; own PR with own design discussion
- **#106 / #107 / #108 Multi-handler routes + priority** — framework breaking change; own PR
- **#111 Typed custom-id utilities** — framework feature; own PR
- **#109 Pre-conditions decorators** — framework feature; own PR
- **#110 Custom error throwing hook** — framework feature; own PR
- **#43 Pre-built components library** — framework feature; own PR
- **#115 DatabaseError default effect** — framework feature; own PR
- **#40 User guide / `apps/guide`** — separate workstream. Stack decision locked: **fumadocs** (Next.js + MDX). Needs content design before implementation. Own PR.
- **`apps/home`** — single landing page; great-looking design. Stack: Next.js for consistency with rest of monorepo. Needs design pass first. Own PR.
- **`apps/docs` landing page redesign / removal** — flagged by user as needed but not in this PR. **Not in PR #130 either** (that branch is `feat/api-docs-updates`, an earlier draft whose commits are all contained in #131's history — `bcaa348b` is #130's tip and sits mid-history on `feat/better-api-extraction`). When #131 merges, close #130 without merging. The landing-page redesign should be its own future PR after #131 lands; track via a new GitHub issue.
- **#132 Hide `@internal` members in docs** — docs enhancement; can land alongside #131 if trivial, otherwise defer
- **Reorganize `packages/eslint-config` rule set** — out of dep bump scope; own PR
- **Docs.json schema versioning beyond `schemaVersion: 1`** — premature
- **Multi-locale docs** — premature
- **OpenGraph / SEO metadata on entity pages** — phase 7's DOCS_SYSTEM mentions but actual implementation deferred unless trivial
- **Framework decision (Next vs Vite + React)** — settled: stay on Next.js. Reasoning: apps/docs uses ~12 Next features in real use (App Router, route handlers, SSR/ISR, `generateMetadata`, `next/{image,font,link,script,navigation,server}`); the docs use case wants SSR/ISR for SEO + first paint; TASK-20's `revalidate: 600` ISR strategy only works with a server framework; Vercel-optimal. Not re-litigating.

---

## Reference Materials Produced

These docs are inputs to the task files. Read them before each phase:

| File                                    | Phase consumed | What it gives you                                                                                          |
| --------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| `.vscode/docs/DEP_RESEARCH_TS_ECO.md`   | 03, 06         | Per-dep latest, breaking changes, migration recipes for TS / eslint / vite / tsup / tsx / vitest ecosystem |
| `.vscode/docs/DEP_RESEARCH_FRONTEND.md` | 04             | Same for next / react / radix / tailwind / shiki / zustand / cmdk / lucide / etc.                          |
| `.vscode/docs/DEP_RESEARCH_DOMAIN.md`   | 05             | Same for discord.js / mongoose / winston / ink / commander / typedoc / etc.                                |
| `.vscode/docs/DEP_BUMP_RESEARCH.md`     | 02, 03, 04, 05 | Catalog reorg proposal + cross-cutting sequencing                                                          |
| `.vscode/audits/QUALITY-apps-docs.md`   | 09             | apps/docs punch list — HIGH/MEDIUM/LOW + test gaps + lib/docs cleanup candidates                           |
| `.vscode/audits/QUALITY-cli.md`         | 10             | packages/cli punch list — HIGH/MEDIUM/LOW + HMR review + public API audit                                  |
| `.vscode/audits/QUALITY-framework.md`   | 11             | Framework packages punch list — HIGH/MEDIUM/LOW + cross-package consistency + API surface                  |
| `.vscode/docs/URL_SPEC.md`              | 12             | URL grammar, fragment rules, acceptance tests, file inventory for impl                                     |
| `.vscode/temp.md`                       | every session  | Kickoff doc for a fresh session: workflow, locked decisions, common pitfalls, first-message template       |

---

## How to Update This Document

**After completing each task:**

1. Update the status table (top + tracker) — mark `✅ Completed` with commit hash
2. Fill in the handoff section for that TODO inside the `TASK-NN-*.md` file (the master plan stays terse)
3. Update the next task's prerequisites if any changed
4. Add a changeset (`pnpm cs`) if a published package was touched
5. Commit with a conventional message that references the TODO

**Example commit message:**

```
chore(deps): TASK-03 — bump TS to 6.0.3 + typescript-eslint to 9.x

- Workspace catalog now has TS 6.0.3 under peer:
- All packages tc-clean against new compiler
- Notable migrations: <X, Y, Z>
- Changesets: <pkg> minor (consumer-affecting TS narrowing)
```

---

## Summary

**Key Principle:** **Dep bump first, quality second, refactor third, features last.** Every change you make on a stale dep is a change you'll redo when the dep bumps. Every change you make on top of unfixed quality issues is a change that inherits them.

Begin with **TASK-01: Baseline gates clean** when ready. See `TASK-01-baseline.md` for the discrete steps. After 01 lands clean, the dependency graph above defines the order.
