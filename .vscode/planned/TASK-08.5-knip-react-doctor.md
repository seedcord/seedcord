# TODO 08.5: Add knip + react-doctor

## Overview

Bring seedcord to tooling parity with cancrops. Two scanners get wired in, both at workspace root, both running as part of `prePush`:

- **knip** — dead exports, dead files, unused deps/devDeps across the monorepo
- **react-doctor** — React 19 antipatterns (mutable deps in arrays, `useContext` vs `use`, deprecated `forwardRef`, `font-bold` on headings, hydration-mismatch sources, giant components, barrel imports, sequential awaits, etc.)

This task lands **between TASK-08 (CI cleanup) and TASK-09/10/11 (quality fixes)** so the audits I produced manually can be cross-checked against the tools' output before fixes are applied — anything react-doctor flags that the audit missed gets added to the punch list; anything the audit flagged that react-doctor doesn't catch stays manual.

## Goals

1. **knip installed + configured** with `knip.json` at workspace root following the cancrops shape (entries / project / ignoreDependencies / ignoreBinaries per workspace).
2. **react-doctor installed + configured** with `react-doctor.config.json` at workspace root targeting the React-bearing surfaces (`apps/docs`, `packages/cli` — Ink uses the React reconciler so same antipatterns apply).
3. **Root scripts** `pnpm knip` and `pnpm react-doctor` exist.
4. **`prePush` runs both** after `tc`/`lint`/`test` are clean.
5. **Audit cross-check**: re-run the QUALITY-*.md audits against the tools' output; reconcile.
6. **Add `lint` bucket entries** to the workspace catalog for `knip` and the react-doctor deps.

---

## Files to Change

### Files to CREATE

- `knip.json` — workspace-root config
- `react-doctor.config.json` — workspace-root config

### Files to MODIFY

- `pnpm-workspace.yaml` — add `knip` + `react-doctor` (+ peer deps if needed) under `lint` bucket
- `package.json` (root) — add `knip` + `react-doctor` to devDependencies (catalog refs); add `knip` and `react-doctor` scripts; extend `prePush`
- `.vscode/audits/QUALITY-apps-docs.md`, `QUALITY-cli.md`, `QUALITY-framework.md` — append a "Tool reconciliation" section per audit noting findings the new tools confirm / contradict / add

---

## Implementation Approach

### Step 1 — Install knip

```sh
pnpm add -Dw knip
```

(`-w` for workspace root.) Confirm version added to root `package.json` devDeps. Hoist to workspace catalog under `lint` once stable.

### Step 2 — Configure knip

`knip.json`:

```jsonc
{
    "$schema": "https://unpkg.com/knip@latest/schema.json",
    "ignoreBinaries": [
        // Add shell keywords / non-node binaries here as needed
    ],
    "workspaces": {
        ".": {
            "entry": [
                "scripts/extract-docs.ts",
                "scripts/**/*.ts"
            ],
            "project": ["scripts/**/*.ts"]
        },
        "packages/seedcord": {
            "entry": ["src/index.ts", "src/internal.index.ts"]
        },
        "packages/services": {
            "entry": ["src/index.ts", "src/internal.index.ts"]
        },
        "packages/utils": {
            "entry": ["src/index.ts", "src/internal.index.ts"]
        },
        "packages/types": {
            "entry": ["src/index.ts"]
        },
        "packages/plugins": {
            "entry": ["src/index.ts"]
        },
        "packages/cli": {
            "entry": ["src/index.ts", "src/cli.ts", "bin/seedcord.mjs"]
        },
        "packages/docs-engine": {
            "entry": ["src/index.ts", "src/smoke.ts"]
        },
        "packages/docs-generator": {
            "entry": ["src/index.ts"]
        },
        "packages/eslint-config": {
            "entry": ["src/index.ts"]
        },
        "packages/tsup-config": {
            "entry": ["src/index.ts"]
        },
        "apps/docs": {
            "entry": [
                "src/app/**/{page,layout,route,not-found}.{ts,tsx}",
                "src/app/**/{loading,error}.tsx",
                "next.config.ts",
                "postcss.config.mjs"
            ],
            "project": ["src/**/*.{ts,tsx}"],
            "ignoreDependencies": [
                // Tailwind plugin (loaded via postcss config, not imported)
                "@tailwindcss/postcss",
                "tailwindcss",
                "prettier-plugin-tailwindcss"
            ]
        },
        "mock": {
            "entry": ["src/index.ts"]
        }
    }
}
```

Iterate: run `pnpm knip`, triage each finding. False positives go into `ignoreDependencies` / `ignoreBinaries` / additional `entry` patterns. Real findings either get fixed in this task (if small) or rolled into TASK-09/10/11.

### Step 3 — Install + configure react-doctor

`react-doctor` is the cancrops convention; if the actual npm package name differs (`@react-doctor/cli`, `react-doctor-cli`, or similar — verify), use that name. The config-file shape is what matters: it lists which packages contain React code.

```sh
pnpm add -Dw react-doctor    # or the actual pkg name
```

`react-doctor.config.json`:

```json
{
    "$schema": "https://unpkg.com/react-doctor@latest/schema.json",
    "packages": [
        "apps/docs",
        "packages/cli"
    ],
    "rules": {
        "no-mutable-in-deps": "error",
        "no-array-index-as-key": "warn",
        "no-react19-deprecated-apis": "warn",
        "prefer-useReducer": "warn",
        "js-combine-iterations": "warn",
        "server-sequential-independent-await": "warn",
        "async-defer-await": "warn",
        "rendering-hydration-mismatch-time": "error",
        "no-barrel-import": "warn",
        "no-giant-component": "warn",
        "design-no-bold-heading": "warn",
        "design-no-redundant-size-axes": "warn"
    },
    "suppressions": []
}
```

Run `pnpm react-doctor`. Triage findings. Tune severity per repo taste.

### Step 4 — Root scripts

```diff
 {
   "scripts": {
+    "knip": "knip",
+    "react-doctor": "react-doctor",
-    "prePush": "pnpm build && pnpm tc && pnpm tc:scripts && pnpm lint && pnpm lint:scripts && pnpm test"
+    "prePush": "pnpm build && pnpm tc && pnpm tc:scripts && pnpm lint && pnpm lint:scripts && pnpm test && pnpm knip && pnpm react-doctor"
   }
 }
```

> Order matters: knip + react-doctor at the end of prePush, after the existing gates. They're slowest; running them on a broken-typed tree wastes wall-clock.

### Step 5 — Reconcile with the manual audits

For each audit (`.vscode/audits/QUALITY-{apps-docs,cli,framework}.md`), append a section:

```markdown
## Tool reconciliation (TASK-08.5 cross-check)

### react-doctor findings the manual audit missed
- `file:line` — <rule> — <one-line>

### Manual audit findings react-doctor doesn't catch
- (these stay manual; expected behavior)

### Conflicting interpretations
- (rare; resolve case-by-case)

### Knip findings (dead code)
- (per workspace)
```

This makes TASK-09/10/11 work easier: just walk both manual + tool findings.

### Step 6 — Update SKILL doc

`.github/skills/code-quality/SKILL.md` currently says these tools "aren't installed yet — review-enforced." After this task, flip the language: rules are now tool-enforced. Re-add the table row format from cancrops (with the `pnpm knip` / `pnpm react-doctor` commands).

### Step 7 — Commit

```sh
git add knip.json react-doctor.config.json pnpm-workspace.yaml package.json pnpm-lock.yaml .vscode/audits/ .github/skills/code-quality/SKILL.md
git commit -m "chore: add knip + react-doctor, wire into prePush, reconcile audits"
```

Changesets: none (devDep additions only; no published surface drift).

---

## Acceptance Criteria

### Functional

- [ ] `pnpm knip` exits 0 (after false-positive triage in `knip.json`)
- [ ] `pnpm react-doctor` exits 0 (after suppressions / severity tuning)
- [ ] `pnpm prePush` runs both and exits clean
- [ ] Each `QUALITY-*.md` audit has a "Tool reconciliation" section listing diffs vs tool output
- [ ] `.github/skills/code-quality/SKILL.md` reflects the new tool-enforced status

### Code Quality

- [ ] No false-positive suppressions without a reason comment in the config file
- [ ] No real findings ignored — flag for TASK-09/10/11 if needed

---

## Risks and Mitigation

| Risk | Mitigation |
|---|---|
| `react-doctor` isn't a published package; cancrops uses a fork or custom tool | Verify cancrops's `package.json` to identify the actual dep; if internal, port the rules manually as an ESLint plugin instead |
| knip floods with false positives on first run | Triage iteratively; commit `knip.json` config tweaks as the false-positives are identified |
| react-doctor severity tuning bikesheds | Match cancrops's defaults; treat as starting point |
| Tools surface 50+ new findings, blowing scope | Roll the bulk into TASK-09/10/11; only fix here if it's a 5-min change and on the path |
| Tools fail in CI because of Node engine drift | `engines.node` already bumps to `^22.13.0` in TASK-03; verify these tools work on that floor |

---

## Related TODOs

- Blocked by: TASK-08 (CI cleanup; tools should be available in the same CI runs)
- Unblocks: TASK-09/10/11 quality fixes — they consume the reconciled audits

---

## Notes

- **Complexity:** Medium (config tuning + reconciliation, not net-new logic)
- **Files affected:** 5-6
- **Touches published packages:** No
- **Estimated wall-clock:** 2-4 hours (most is false-positive triage)
