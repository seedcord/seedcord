# TODO 09: apps/docs code-quality fixes

## Overview

Apply `.vscode/audits/QUALITY-apps-docs.md` punch list. **9 HIGH, 32 MEDIUM, 13 LOW, 18 test gaps.** Plus a detailed `lib/docs` cleanup map — that map drives TASK-13, but smaller cleanup wins can land here.

## Goals

1. **All HIGH fixed.** Notably:
    - H1 `tw` template tag inverted guard in `apps/docs/src/lib/utils.ts:13` (silently swallows interpolated values)
    - H2 `DocsUIContext` dead snapshot path in `apps/docs/src/app/docs/layout.tsx:65-74` (always-empty `{}` injected; consumers always read undefined)
    - H3 8 `as unknown as T` double-casts around `FunctionSignatureModel` missing `anchor` field — fix the model, the casts evaporate
2. **MEDIUM fixed in same pass** unless flagged as out-of-scope for this PR.
3. **LOW only if touched** by a HIGH or MEDIUM fix (don't fan out).
4. **Test gaps**: add tests for the modules whose fixes risked regressions.

## Source of truth

`.vscode/audits/QUALITY-apps-docs.md`. Read it cover to cover before starting.

---

## Files to Change

The audit lists each finding with `file:line` and a concrete fix. Most-touched files (from the top 3 alone):

- `apps/docs/src/lib/utils.ts` — fix inverted guard in `tw`; add tests
- `apps/docs/src/app/docs/layout.tsx` — remove dead `__DOCS_UI__` snapshot machinery OR wire it up properly
- `apps/docs/src/components/docs/entity/EntityMembersSection.tsx` — remove dead `useContext(DocsUIContext)` (or align with whatever H2's resolution is)
- `apps/docs/src/components/docs/entity/MemberAccessControls.tsx` — same
- `apps/docs/src/lib/docs/types.ts` (likely) — add `anchor` field to `FunctionSignatureModel` (resolves the 8 double casts)
- `apps/docs/src/lib/docs/builders/buildSignatureDetails.ts` — drop double casts after model fix
- `apps/docs/src/lib/docs/builders/buildFunctionSignature.ts` — same

Remaining MEDIUM/LOW per the audit.

---

## Implementation Approach

Work the audit top-down: HIGH → MEDIUM → LOW.

### For each finding

1. Open the file at the cited line. Re-read in context (cited diagnosis may be slightly off; trust the file).
2. Apply the recommended fix or one functionally equivalent.
3. Run `pnpm -C apps/docs lint:fix && tc` after every ~5 fixes (catch regressions early).
4. Run `pnpm -C apps/docs test` after each "chunk" of related findings.
5. Commit per logical group (~5-10 findings) with a conventional message: `fix(apps/docs): <theme>`.

### Suggested commit groupings

```
fix(apps/docs): fix tw template tag silent-swallow + tests
refactor(apps/docs): remove dead DocsUIContext snapshot path
fix(apps/docs): add anchor to FunctionSignatureModel + drop 8 double casts
fix(apps/docs): React 19 / Tailwind v4 antipatterns batch 1
fix(apps/docs): React 19 / Tailwind v4 antipatterns batch 2
refactor(apps/docs): dead-export cleanup
tests(apps/docs): coverage for lib/docs/* modules
```

### Test gaps coverage

Per audit's "Missing unit tests" section. Write Vitest tests for each module flagged. Use the existing `apps/docs` vitest config / setup if present; create one (mirroring `packages/docs-engine/vitest.config.ts`) if not.

---

## Acceptance Criteria

### Functional

- [ ] Every HIGH finding in `QUALITY-apps-docs.md` is either fixed or has a written justification (in the audit doc itself) for why it's deferred
- [ ] Every MEDIUM finding is fixed or explicitly deferred to a follow-up issue
- [ ] LOW findings touched by HIGH/MEDIUM fixes are also resolved (don't ship inconsistency)
- [ ] No findings are duplicated in the audit after the fixes land

### Code Quality

- [ ] `pnpm -C apps/docs lint:fix && tc && test` exits 0 errors / 0 warnings / 100% passing
- [ ] No new `// eslint-disable` or `// @ts-ignore` added without inline justification
- [ ] No new `as any` or `as unknown as T` double casts
- [ ] Manual smoke: `pnpm -C apps/docs dev` renders identically (or intentionally — call out in commit body)

### Publishing

- [ ] N/A (apps/docs is not published)

---

## Testing Requirements

### New unit tests (per audit gap list)

The audit identifies 18 test gaps. Add at minimum:

- `apps/docs/src/lib/utils.ts` (`tw`, `cn`) — test the guard fix; assert known interpolation cases
- `apps/docs/src/lib/docs/builders/*` — at least one test per builder
- `apps/docs/src/lib/docs/resolveReferenceHref.ts` — covered by URL spec tests in TASK-12, but a unit-level test here helps

### Manual smoke

After each commit group, open `pnpm -C apps/docs dev` and visit:

- Home page
- One class page (e.g. `/docs/packages/seedcord/0.10.6/classes/seedcord`)
- One function page with overloads
- The cmdk search
- Theme toggle

---

## Risks and Mitigation

| Risk                                                                     | Mitigation                                                                                                                  |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| H1 fix changes `tw` output silently                                      | Add test fixtures before fixing the guard; assert known outputs                                                             |
| H2 removal breaks intended SSR seeding                                   | Confirm with the audit doc whether to delete dead path or wire it up; default: delete + open issue if the feature is wanted |
| Model change (add `anchor`) triggers cascade in builders                 | Run `pnpm -C apps/docs tc` after the model edit; fix every error in same commit                                             |
| Lucide / shiki bumps (from TASK-04) may already make some findings stale | Re-validate findings after TASK-04 lands; close stale ones in the audit doc ture is wanted                                  |
| Model change (add `anchor`) triggers cascade in builders                 | Run `pnpm -C apps/docs tc` after the model edit; fix every error in same commit                                             |
| Lucide / shiki bumps (from TASK-04) may already make some findings stale | Re-validate findings after TASK-04 lands; close stale ones in the audit doc                                                 |

---

## Related TODOs

- Blocked by: TASK-04 (frontend bump — some findings may already be obsolete)
- Blocks: TASK-12 (URL impl touches same `resolveReferenceHref.ts` file), TASK-13 (lib/docs cleanup uses this audit's cleanup map)

---

## Notes

- **Complexity:** Medium-high (lots of fixes, repetitive but care needed)
- **Files affected:** ~25-50 files across apps/docs
- **Touches published packages:** No
- **Estimated wall-clock:** 6-10 hours
