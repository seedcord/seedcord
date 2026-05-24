# TODO 21: `.vscode/docs/DOCS_SYSTEM.md` — final user-facing system doc

## Overview

The PR's last deliverable. Write a single doc covering every operational detail of the docs system: how it works end-to-end, how to operate it, how to debug it, how to recover from failures.

## Goals

Comprehensive but concise. Future-you (or any other implementor) reads this doc and knows:

1. The data plane (index.json + per-pkg per-version project.json)
2. The control plane (publish.yml → docs-publish.yml → artifacts repo)
3. How to develop locally
4. How a release becomes published docs
5. How to manually backfill / fix / force-republish a version
6. The env var contract for apps/docs deployment
7. The schema reference for `index.json` and `project.json`
8. How to debug each tier when it fails
9. Vercel ops (rollback, redeploy, env updates)

## File to Create

`.vscode/docs/DOCS_SYSTEM.md`

## Outline

```markdown
# Seedcord Docs System

## Overview

[Topology diagram (ascii is fine): seedcord repo → publish → docs-publish → seedcord/artifacts → jsDelivr → apps/docs (Vercel)]

## Components

### `@seedcord/docs-generator`

[What it does, how it's invoked, flags, output shape]

### `@seedcord/docs-engine`

[Runtime engine, index.json consumer, jsDelivr fetcher, setVersion API]

### `apps/docs`

[Next.js app structure, env contract, deployment]

### `seedcord/artifacts` repo

[Layout, index.json schema, project.json schema, branching strategy]

## End-to-end flow

### Local development

[`pnpm docs:smoke`, `pnpm -C apps/docs dev`, how to point at local index]

### Publishing a new version

[`pnpm cs:publish` → tag created → publish.yml succeeds → docs-publish.yml triggers → artifacts repo gets the new project.json + index.json → apps/docs ISR revalidates within 10 min → live]

## Operating

### Backfilling a missing version

[`ARTIFACTS_PAT=... pnpm seed:artifacts` from the seedcord repo, scoped to one tag]

### Force-republishing

[Delete the version's path in artifacts; trigger docs-publish via workflow_dispatch]

### Vercel ops

[Rollback, redeploy, env updates, ISR purge]

### Debugging

- index.json doesn't reflect a new version → check docs-publish.yml workflow_run conclusion
- entity page 404 → check artifacts repo for the project.json
- search not finding entity → engine `setVersion` called? check apps/docs network tab
- Vercel build fails → check `vercel.json` build command
- ARTIFACTS_PAT issues → secret rotation steps

## Schemas

### `index.json`

[Full TS interface + example]

### `project.json`

[High-level shape + reference to docs-engine types]

## Secrets

### `ARTIFACTS_PAT`

- Type: fine-grained PAT
- Scope: `contents:write` on `seedcord/artifacts` only
- Location: seedcord repo Settings → Secrets
- Rotation: every 6 months; document the process

## URL specification

[Pointer to `.vscode/docs/URL_SPEC.md` for the URL grammar]

## Deferred / known limitations

- Multi-locale support: not implemented
- OpenGraph metadata: minimal; future work
- Search across all loaded versions: deliberately disabled (UX decision)
- React Compiler ESLint: not installed (still RC at PR ship time)

## Open follow-ups

- (List, with issue links, the v1.0 framework blockers not in this PR)
```

## Implementation Approach

1. Write the topology diagram first — readers want the overall shape upfront
2. Per-component sections: pull verbatim from the corresponding TASK-NN files (those are the implementation; this is the operator's manual)
3. Schema sections: reference URL_SPEC.md, link, don't re-define
4. Debugging section: from real runtime considerations + audit findings (e.g., the LoggerChannelRegistry HMR leak fixed in TASK-11 is worth a footnote: "if you see ghost log lines after dev restart, you may have an old binary")
5. Final pass: re-read with the goal "someone with no Claude context can follow this end-to-end"

---

## Acceptance Criteria

- [ ] File exists at `.vscode/docs/DOCS_SYSTEM.md`
- [ ] Topology diagram present
- [ ] Every TASK-NN's deliverable is referenced somewhere in DOCS_SYSTEM (so the doc is "complete")
- [ ] Every env var consumed by apps/docs is listed in the secrets / env section
- [ ] Failure modes per tier have a documented debug path
- [ ] Doc is ~200-500 lines (concise; not exhaustive)

---

## Related TODOs

- Blocked by: every prior task in the plan (the doc summarizes the implemented system)
- Blocks: nothing (last task in the plan)

---

## Notes

- **Complexity:** Low-medium (writing, not engineering)
- **Files affected:** 1 new
- **Touches published packages:** No
- **Estimated wall-clock:** 2-4 hours
