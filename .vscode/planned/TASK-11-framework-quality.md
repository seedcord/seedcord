# TODO 11: Framework code-quality fixes

## Overview

Apply `.vscode/audits/QUALITY-framework.md` punch list across `packages/{seedcord,services,utils,types,plugins,docs-engine,docs-generator,eslint-config,tsup-config}`. Top hits:

- **H1** `typeof CustomError === typeof DatabaseError` always true in `throwCustomError` `[pkg: seedcord]` — latent bug; only one caller today (`WrapDatabaseError`), but the helper is public and ships UUID args to every custom error.
- **H2/H3** `fetchGuildMember`, `fetchRole`, `fetchText` rebrand every Discord API failure (network, permissions, rate limits) as "not found" `[pkg: seedcord]` — masks real outages. `fetchUser` shows the correct `DiscordAPIError + RESTJSONErrorCodes` discriminator pattern.
- **H9** `LoggerChannelRegistry.configure()` leaks winston transports across HMR cycles `[pkg: services]` — sinks map per-channel transport overwrites without removing old transports.

## Source of truth

`.vscode/audits/QUALITY-framework.md` — read cover to cover.

---

## Goals

1. All HIGH findings fixed.
2. MEDIUM fixed unless audit notes "deferred."
3. Public-API-surface candidates flagged by audit → demoted to `internal.index.ts` or deleted.
4. Cross-package consistency violations (logger usage, error class usage, StrictEventEmitter usage) resolved.
5. Test coverage gaps filled where the fix added risk.

## Implementation Approach

Top-down by package. Suggested order (driven by churn risk):

1. `packages/services` — H9 logger leak + Errors family (changeset patch)
2. `packages/seedcord` — H1 throwCustomError + H2/H3 fetch rebranding + interactor/effects findings (changeset minor — Discord error surface visible to users)
3. `packages/docs-engine` + `packages/docs-generator` — recently-refactored; targeted findings only (changeset patch)
4. `packages/utils` + `packages/types` — tight surface, low-risk (changeset patch each)
5. `packages/plugins` — kysely + mongoose touchpoints (changeset patch)
6. `packages/eslint-config` + `packages/tsup-config` — devDep surface only

### Commit groups

```
fix(services): LoggerChannelRegistry transport leak across HMR cycles
fix(services): error class generics + isSeedcordError narrowing
fix(seedcord): throwCustomError type-check correctness
fix(seedcord): fetchGuildMember/fetchRole/fetchText error discrimination per fetchUser pattern
refactor(seedcord): public API surface demotions per audit
fix(docs-engine): <audit findings>
fix(docs-generator): <audit findings>
refactor(framework): cross-package consistency — logger / errors / event emitter usage
tests(framework): coverage for fixes that touch public API
```

---

## Acceptance Criteria

- [ ] Every HIGH in audit either fixed or has written deferral in audit
- [ ] MEDIUM addressed
- [ ] `pnpm prePush` clean
- [ ] Manual: `pnpm -C mock dev` smokes (exercises framework end-to-end via the mock bot)
- [ ] Changesets per touched package

---

## Related TODOs

- Blocked by: TASK-03 (TS 6), TASK-05 (typedoc + plugins lockstep affects docs-engine/generator findings)
- Blocks: TASK-12 (URL spec touches docs-engine mappers; resolve framework findings first)

---

## Notes

- **Complexity:** High — broad surface
- **Files affected:** 30-60 across packages
- **Touches published packages:** Yes — every framework package gets a changeset (mostly patch, seedcord minor for fetch\* shape)
- **Estimated wall-clock:** 8-12 hours
