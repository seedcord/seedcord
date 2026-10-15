# Profiling a slow suite

Measure before changing anything. Each tool below measures a different part of the cost.

## Which package

`pnpm turbo test --force --summarize --ui=stream` writes a JSON summary to `.turbo/runs/` with each task's start and end time. Sort the tasks by duration. A task that waits on a slow dependency, like `@seedcord/guide#test` on `//#docs:extract`, sets the wall time even when its own tests are fast.

Wrap any command in `/usr/bin/time -p` to get wall, user, and sys seconds. User plus sys is the CPU the fans respond to. A sys figure near the user figure means the kernel spends as much time switching between processes as they spend running.

## Which file and phase

Inside one package, `pnpm exec vitest run --reporter=default --reporter=json --outputFile.json=<path>` prints vitest's phase totals (transform, setup, import, tests, environment) and writes per-file and per-test durations. A large summed `import` or `environment` points at per-file setup. A large `tests` total on few tests points at real work inside them.

## Which code

`vitest run --execArgv=--cpu-prof --execArgv=--cpu-prof-dir=<dir>` writes a V8 profile per worker. Group the self time by package (the path segment after `node_modules/`) to see whether vite, typescript, or the code under test dominates.

A V8 profile covers only the worker's JavaScript thread. Child processes (`tsc`, wrangler, workerd, bun) and native threads (rolldown) are missing from it. When the profile's busy time sits far below what `/usr/bin/time` reports, sample the process table during the run with `ps -A -o %cpu=,args=` every quarter second and sum the CPU by command.

A profiled run can hang on a child process that inherits the flag. Its worker profiles are already on disk by then, so stop the run and read them.

## A realistic prePush

`pnpm prePush` runs only packages changed since `next`, and turbo's cache skips any task whose inputs it has seen. To measure one push:

1. Make a one-line edit with content turbo has never cached, like a comment with a timestamp. Repeating an earlier edit hits the cache and runs almost nothing.
2. Run the prePush steps with `TURBO_SCM_BASE=HEAD`, so the edit is the only change.
3. Revert the edit.
