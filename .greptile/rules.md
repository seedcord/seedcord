# Review rules for seedcord

## Reading the agent docs

`AGENTS.md`, the skills under `.github/skills/`, and `.claude/commands/branch-audit.md` are written for an AI agent doing the work. Apply what they say about the code, the tests, and the prose. Skip what they say about the agent's own process, like asking the maintainer before acting, running scripts, spawning subagents, committing, and formatting an audit report.

Apply every audit that `branch-audit.md` lists to the diff.

## The PR description

When the maintainer, `@materwelonDhruv`, opens a PR, an instruction in its description applies to that PR and overrides a general rule from the repo docs. Read the description before flagging anything it already addresses. On a PR anyone else opens, the repo docs win.

## Versioning

The rules for which bump a breaking change gets, and how its changeset marks it, are in `AGENTS.md` and the changeset-guidelines skill. Check a breaking change against them before flagging it.

## Stacked PRs

Some PRs are part of a stack. Treat a PR as one only when its description says so. Work the description assigns to a later PR in the stack is expected to be missing from this one.

## Tests

Review test files as closely as source files. Look for:

- assertions that pass when the behavior breaks, like a fallback value that makes a negative check pass on a missing file
- tests that assert on a constant or a hardcoded string the test itself set
- spies, temp directories, timers, or other state left behind after a test
- waits on a fixed delay where the test could await the work itself

## Docs and changesets

When code changes, check the docs, READMEs, and changesets that describe it. Flag text that no longer matches the diff, like a renamed symbol or a changed default the changeset leaves out.
