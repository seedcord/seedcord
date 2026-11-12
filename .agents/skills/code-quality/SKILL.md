---
name: code-quality
description: Use this when asked to write code, or audit, sweep, or fix code quality across the seedcord monorepo. Covers the checks that gate a PR, the design rules for a change, and where the TypeScript, OOP, React, and Tailwind conventions are written down. Also use when onboarding any agent to this repo's quality standards.
---

# Code Quality

Tools catch most problems in this repo. The files in this folder cover what a tool can't catch, and design comes first.

## The files

- **[`DESIGN.md`](./DESIGN.md)** covers root causes, repeated fixes, letting data carry a difference, one source of truth, types that can't hold a bad state, and the smallest version first
- **[`PREVENT-REINVENTION.md`](./PREVENT-REINVENTION.md)** covers the checks to run before writing new code, and where a new shared helper belongs
- **[`TYPESCRIPT.md`](./TYPESCRIPT.md)** covers narrowing, discriminated unions, generics, `satisfies`, const assertions, branded types, and `type-fest`
- **[`OOP.md`](./OOP.md)** covers classes vs functions, SOLID, composition vs inheritance, and access modifiers
- **[`FAIL-FAST-RULES.md`](./FAIL-FAST-RULES.md)** covers null handling, invariant checks, and when `?.` and `??` fit
- **[`REACT19.md`](./REACT19.md)** covers the React 19 APIs, what React 19 removed, and the bugs to catch in review. It applies to `apps/*`, `tooling/ui`, and the Ink components in `cli/seedcord`
- **[`TAILWIND.md`](./TAILWIND.md)** covers Tailwind v4, `cn()` and `tw`, the shared tokens, and class shorthands for `apps/*` and `tooling/ui`

---

## The checks

<!--prettier-ignore-start-->

| Check | What it catches | How to run it |
| --- | --- | --- |
| ESLint + TypeScript | Type errors, lint rules, import order | `vp run check --filter=<pkg>` |
| Vitest | Behavior regressions | `vp run check --filter=<pkg>` |
| Oxfmt | Formatting | `vp fmt` / `vp fmt --check` |
| Vale + the prose ESLint pass | Prose rules in docs, comments, and strings | `vp run lint:prose` |
| react-doctor | React antipatterns, plus some loop and await patterns in any TS | `vp run react-doctor`, configured in `doctor.config.ts` |
| knip | Unused files, exports, types, and dependencies | `vp run knip`, configured in `knip.json` |
| changesets | A published package changed without a version bump | `vp run cs`, then `vp run cs:status` |
| Review | `paths` or `include` reaching into another package's `src` | Read every new or changed `tsconfig.json` and `vite.config.ts` |

<!--prettier-ignore-end-->

CI, `vp run prePush`, and `vp run prePush:all` run every tool in the table. `lint:changesets` checks the changeset files, and `vp run cs:status` shows which packages still need one. Put a false positive from knip or react-doctor in that tool's config, with a comment giving the reason.

A PR is ready when every check in the table passes for the packages it touches. Every change to a published package also needs a changeset.

```sh
vp run check --filter=<pkg>      # lint:fix, tc and test, after building what <pkg> depends on
vp run check --filter=...<pkg>   # the same, plus everything that depends on <pkg>
vp run check --affected          # the same, for everything changed since next
vp run prePush                   # every check, on the packages changed since next
vp run prePush:all               # every check, on every package
```

Vite+ runs `vp staged` (configured in `vite.config.ts`) on commit, and commitlint on the message. No hook runs on push. Don't bypass the hooks.

A dependency used by two or more packages belongs in `pnpm-workspace.yaml`'s `catalogs:`, referenced as `catalog:<name>` everywhere.
