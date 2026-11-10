---
name: tdd
description: Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first development.
---

# Test-Driven Development

## Philosophy

Tests check behavior through public interfaces. The code underneath can change completely and the test still passes.

**Good tests** run real code paths through public APIs. They describe what the system does. A name like `'reads nothing back after delete'` states a behavior. Such tests still pass after a refactor because they don't read internal structure.

**Bad tests** couple to internal structure. They mock collaborators you own, reach into private methods, or verify through a side channel instead of the interface. The tell is a test that breaks when you rename an internal function while behavior is unchanged. That test was checking implementation.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for when mocking is warranted.

## Anti-pattern: horizontal slices

Do not write all the tests first and then all the implementation. That treats RED as "write every test" and GREEN as "write every line of code."

This produces weak tests:

- Tests written in bulk check behavior that you imagined.
- You assert on the shape of things (data structures, signatures) instead of observable behavior.
- The tests pass when behavior breaks and fail when behavior is fine.
- You commit to a test structure before the implementation teaches you what matters.

Write vertical slices instead. One test, then one implementation, then repeat. Each test answers what the last cycle taught you. You just wrote the code, so you know which behavior matters and how to check it.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED then GREEN: test1 then impl1
  RED then GREEN: test2 then impl2
  RED then GREEN: test3 then impl3
```

## Where tests live in this repo

Tests go in `<package>/tests/`, mirroring `src/`. Never `src/**/*.test.ts`. A test for `packages/core/src/rateLimiter/KvRateLimiter.ts` is `packages/core/tests/rateLimiter/kv-rate-limiter.test.ts`.

Vitest is the runner. `vp -C <pkg> run test:watch` watches and reruns on change, which is the loop you want during a TDD cycle.

```sh
vp -C <pkg> run test:watch       # during the loop
vp run check --filter=<pkg>      # lint:fix, tc and test, once the slice is done
```

Tests import through the package's `#src/*` alias and may use a pragmatic fixture cast (`as unknown as T`) with a one-line justification comment. No `as any` in tests. The ESLint rule rewrites `any` to `unknown`, which surfaces a real type error if the cast was wrong.

`mocks/` holds one runnable bot per transport. [Trying a feature on a mock](../../../AGENTS.md#trying-a-feature-on-a-mock) covers behavior that needs a real Discord connection.

## Prove a claim before acting on it

When a review, a search, or your own reading points to a bug, a race, or a timing problem, write the test that shows it first. Run it and watch it fail. Then decide what to do: fix it, keep it, or accept the trade-off. A decision made from a claim that nobody ran is a guess.

A refactor works the same way. Pin the current behavior with passing tests, then refactor and rerun them after each step.

## Fold new tests into the ones that exist

Read the tests in the file before adding yours. When an existing test sets up the same scenario, add your assertions to it. When two of your tests check the same shared code, keep one, plus only what it takes to show that each caller passes its data through. When several tests repeat the same setup, move it into one helper that they all call.

## Workflow

### 1. Plan

Before any code:

- [ ] Confirm with the user which interface changes the feature needs.
- [ ] Confirm which behaviors to test, in priority order.
- [ ] Look for [deep modules](deep-modules.md), a small interface over a deep implementation.
- [ ] Design interfaces for [testability](interface-design.md).
- [ ] List the behaviors to test.
- [ ] Get user approval on the plan.

Ask: "What should the public interface look like? Which behaviors matter most to test?"

You cannot test everything. Confirm which behaviors matter and put the effort on the critical paths and the complex logic.

### 2. Tracer bullet

Write ONE test for ONE behavior.

```
RED:   write the test for the first behavior, it fails
GREEN: write the minimal code to pass, it passes
```

The tracer bullet proves the path works end to end.

### 3. Incremental loop

For each remaining behavior:

```
RED:   write the next test, it fails
GREEN: minimal code to pass, it passes
```

Rules:

- One test at a time.
- Only enough code to pass the current test.
- Do not write for tests you have not written yet.
- Keep each test on observable behavior.

### 4. Refactor

Once the tests pass, look for [refactor candidates](refactoring.md):

- [ ] Extract duplication.
- [ ] Deepen modules, move complexity behind a simple interface.
- [ ] Apply SOLID where it fits, no premature abstraction.
- [ ] Note what the new code reveals about existing code.
- [ ] Rerun tests after each refactor step.

Do not refactor while RED. Get to GREEN first.

For a published package, add a changeset (`vp run cs`) once the slice is done.

## Checklist per cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses the public interface only
[ ] Test would survive an internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```
