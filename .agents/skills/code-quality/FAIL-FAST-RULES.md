---
name: fail-fast-rules
description: Use this when writing, refactoring, or reviewing code paths that involve null handling, invariant checks, optional dependencies, or async resource access patterns.
---

# Fail-Fast Rules

Don't hide a missing value. If code assumes a reference exists, use it directly. If it's missing, let the error surface and fix the root cause. A cast or a silent fallback only hides it.

**Write an explicit check in two cases only:**

1. **A broken invariant.** When a condition must always hold, like the execution context, the state, a required config value, or an auth match, throw a `SeedcordError` whose message gives the fix. A guard that returns quietly hides the bug.
2. **An expected optional branch.** When null or undefined is a real runtime case with defined behavior, like an optional dependency or a config value with a real fallback, check it with `?.` and `??` and handle it on purpose. The fallback must mean something.

Everything else: use it directly, let it throw, and fix the root cause.

**On `?.` and `??`:** prefer them over casts, but only when the nullish case is an expected branch that the code handles on purpose. Using them to quiet an error hides a broken assumption. A chain of them on one value usually means its type has optional fields that never should have been optional. [DESIGN.md](./DESIGN.md#5-pick-a-shape-that-cant-hold-the-wrong-state) covers that fix.

```ts
// Bad: hides a missing dependency and a broken contract
const result = service?.doThing() ?? null;

// Good: null is a documented state with real handling
const user = session?.user ?? guestUser;

// Bad: casts the problem away
const name = (obj as any).name;

// Good: throws if the contract breaks
const name = obj.name;
```
