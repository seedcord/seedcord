---
name: test-performance
description: Use this when writing or changing a test, a test helper, or a vitest config in seedcord, and when a test is slow or fails only in the full suite. Covers the shared-worker setup every package runs on, cleaning up state with Disposable handles, keeping expensive setup rare, and checking a change for leaks.
---

# Test performance

Every package's tests run in shared workers, inside a workspace run that already uses most of the machine. A test that leaks state breaks a file that runs after it. A test that boots, builds, or typechecks more than it needs keeps every core busy for longer. Both show up in `pnpm prePush` as flakes and spinning fans.

## How the workers run

`@seedcord/vitest-config` sets these for every package. Leave them alone in a package's own config.

- `isolate: false`. A worker process runs many test files in turn.
- A setup file calls `vi.resetModules()` before each file. Each file gets fresh instances of the modules vitest runs, so a `vi.mock`, a static cache, or a module-level singleton stays inside its file.
- `maxWorkers: '25%'`, with `concurrency: "2"` in `turbo.json`. Together they keep about half the cores free.

The reset covers only modules vitest runs itself. Everything below survives into the next file in the same worker:

- `globalThis` slots, like the ones a built bot or baked ids use
- `process.env` and anything else on `process`, such as `cwd`
- open servers, sockets, timers, and child processes
- files written to disk, including copies under `tests/temp`
- packages in `node_modules`, which Node loads once. envapt caches `process.env` on first read, so the shared config inlines it. `@testing-library/react` registers its auto cleanup only in the first file, so each React package's setup file calls `afterEach(cleanup)`.

A new package from `node_modules` that keeps state across calls goes in `server.deps.inline` in the shared config, the way envapt does.

## Clean up with Disposable handles

Anything a test creates outside its own module gets cleaned up by a handle the test holds with `using` or `await using`.

- A helper that creates a resource returns it as a `Disposable` or `AsyncDisposable`, with cleanup in `[Symbol.dispose]` or `[Symbol.asyncDispose]`. See `registerBuiltFiles` in `packages/http/tests/helpers/builtFiles.ts`.
- A helper with several setup steps builds an `AsyncDisposableStack`, `defer`s each cleanup as it goes, and returns `stack.move()` at the end. A step that throws then cleans up the steps before it. See `edgeProject` and `startedRuntime` in `cli/seedcord/tests/dev/edgeDevRuntime.ts`.
- `using` disposes in reverse order of declaration. Declare the thing that writes into a resource after the resource, so it stops first.
- `await using` disposes when the test body ends, which is before any `onTestFinished` hook runs. Cleanup that has to run before a `using` resource is released is itself a `using` declaration.
- A `using` binding the test never reads takes a leading underscore, as in `await using _started = ...`.
- Node objects that already implement disposal, like `http.Server`, need no wrapper.

A package whose tests write a global slot also clears that slot in its setup file, so a test that forgot its handle still leaves the next file clean. `packages/http/tests/setup.ts` does this.

## Keep expensive setup rare

Real builds, `tsc`, workerd boots, and typed lint programs cost seconds of CPU each. Pay for one only where the test checks what it produces.

- Tests that only read a booted runtime or a built project share one per file, built in `beforeAll` and disposed by the function `beforeAll` returns. Tests that edit files, change env, or start and stop on purpose keep their own.
- cli build tests use `quickBuildRunner()` from `cli/seedcord/tests/commands/build/quickBuildRunner.ts`, which skips `tsc`. Use `BuildRunner.create` only in a test about typechecking.
- Work that only CI needs, like compiling a bun binary, checks `process.env.CI` through one helper (`compilesBunBinaries`). Move a test to CI only when a CI job already runs it on every push.
- typescript-eslint's `RuleTester` clears the parser caches after every file. The typed rule testers replace `RuleTester.afterAll` with a no-op so each worker builds the typed program once.

## Write tests that hold under load

The full suite runs with the machine busy, so a step that takes 3ms alone can take 30ms there.

- Wait on the condition the test checks, with `vi.waitFor` or the cli's `settled` helper. A fixed sleep is too short under load and too slow when idle.
- When a test masks output that varies, like a duration, mask the padding around it too. Column widths change with the value.
- To reproduce a flake that only shows under load, inject the delay where it happens, like a fake REST reply that waits 15ms. Saturating the CPU rarely reproduces it.
- The cli prompt tests rely on `PromptTerminal.press()` polling every 50ms between keys, which gives React time to commit each key. Shortening that poll breaks them.

## Check a change

Run these before calling a test change done:

1. `pnpm -C <pkg> exec vitest run --maxWorkers=1`. One worker runs every file in one process, which shows a cross-file leak in a single run.
2. Run the package suite twice. An order-dependent leak can pass once.
3. Confirm `tests/temp` is empty afterwards. `pnpm clean:scratch` clears what a killed run left behind.

To find where a suite spends its time, read [`PROFILING.md`](PROFILING.md).
