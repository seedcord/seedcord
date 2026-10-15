---
name: test-performance
description: Use this when writing or changing a test, a test helper, or a vitest config in seedcord, and when a test is slow or fails only in the full suite. Covers the shared-worker setup every package runs on, cleaning up state with Disposable handles, keeping expensive setup rare, and checking a change for leaks.
---

# Test performance

Every package's tests run in shared workers, inside a workspace run that already uses most of the machine. A test that leaks state breaks a file that runs after it. A test that boots, builds, or typechecks more than it needs keeps every core busy for longer. Both show up in `pnpm prePush` as flakes and spinning fans.

## How the workers run

`@seedcord/vitest-config` sets these for every package. Leave them alone in a package's own config. apps/docs is the one exception, with `isolate: true` until its tests stop mocking its own modules.

- `isolate: false`. A worker process runs many test files in turn.
- A setup file calls `vi.resetModules()` before each file. Each file gets fresh instances of the modules vitest runs, so a static cache or a module-level singleton stays inside its file.
- `maxWorkers: '25%'` when `CI` is unset, with `concurrency: "2"` in `turbo.json`. Together they keep about half of a dev machine's cores free. CI runners keep vitest's default.

The reset covers only modules vitest runs itself. Everything below survives into the next file in the same worker:

- `globalThis` slots, like the ones a built bot or baked ids use
- `process.env` and anything else on `process`, such as `cwd`
- open servers, sockets, timers, and child processes
- files written to disk, including copies under `tests/temp`
- packages in `node_modules`, which Node loads once

A package from `node_modules` that keeps state across calls goes in `server.deps.inline` in the shared config. vitest then runs it, and the reset reloads it for each file. envapt is there because it caches `process.env` on first read. `@testing-library/react` is there because it registers its auto cleanup when it loads.

## Mocks

The reset leaves vitest's mock registry alone. A `vi.mock` in one test file replaces that module for every later file in the same worker, so `vi.mock` and `vi.doMock` go only in `tests/setup.ts`. That includes helpers a test file imports.

- A module every test in the package needs faked goes in `tests/setup.ts`, mocked the same way for every file. See the REST fake in `packages/http/tests/setup.ts` and its `restClients()` helper.
- A test that needs to read or change one call spies on the class with `vi.spyOn(SomeClass.prototype, 'method')` and restores it in `afterEach`. A spy patches the class this file loaded and leaves the module registry alone.
- A test that needs its own behavior passes the fake in, through a constructor argument or a parameter. `TypeChecker` takes its `tsc` runner this way, and the create-seedcord steps take their prompt streams.

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
- cli build tests use `quickBuildRunner()` from `cli/seedcord/tests/commands/build/quickBuildRunner.ts`, which skips `tsc`. `BuildRunner.create` runs the real check, for the type-error test, one passing build, and builds that fail before the check runs.
- Work that only CI needs, like compiling a bun binary, checks `process.env.CI` through one helper (`compilesBunBinaries`). Move a test to CI only when a CI job already runs it on every push.
- typescript-eslint's `RuleTester` clears the parser caches after every file. The typed rule testers replace `RuleTester.afterAll` with a no-op so each worker builds the typed program once.

## Write tests that hold under load

The full suite runs with the machine busy, so a step that takes 3ms alone can take 30ms there.

- Wait on the condition the test checks, with `vi.waitFor` or the cli's `settled` helper. A fixed sleep is too short under load and too slow when idle.
- When a test masks output that varies, like a right-aligned duration, replace the value and its padding with a string of the same width. The column stays checked, and the value's length stops mattering.
- To reproduce a flake that only shows under load, inject the delay where it happens, like a fake REST reply that waits 15ms. Saturating the CPU rarely reproduces it.
- Ink draws at most one frame every 34ms, the throttle from its default `maxFps` of 30. A prompt test asserts the expected screen inside `settled`, which retries until that frame is drawn.

## Check a change

Run these before calling a test change done:

1. `pnpm -C <pkg> exec vitest run --maxWorkers=1`. One worker runs every file in one process, which shows a cross-file leak in a single run. In packages/http, add `--project node`, since the workerd pool isolates its own files.
2. Run it with `--sequence.shuffle.files --sequence.seed=<n>` for two or three seeds. CI groups files into workers differently from your machine, and a leak that depends on file order shows up under a different order.
3. Confirm `tests/temp` is empty afterwards. `pnpm clean:scratch` clears what a killed run left behind.

To find where a suite spends its time, read [`PROFILING.md`](PROFILING.md).
