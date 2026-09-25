---
description: Adversarial read-only audit of the current branch against next, through one subagent
argument-hint: '[opus|sonnet|fable]'
disable-model-invocation: true
---

Run an adversarial audit of the current branch through a single subagent, then check its findings before relaying them.

Parse the model from `$ARGUMENTS`: `opus`, `sonnet`, or `fable`. Default `opus`. Spawn one agent with the Agent tool (`subagent_type: general-purpose`), set `model` explicitly, and run it in the background.

Give the agent exactly the prompt below, word for word. Add nothing to it: no file hints, no suspected findings, no earlier audit results.

When it finishes:

1. Reproduce every finding it marks CONFIRMED against the source or the built CLI before calling it real, and check its SUSPECTED ones the same way where the answer changes what gets fixed.
2. Present the findings as a table with a verdict for each (fix, reject, or the user's call) and the evidence behind the verdict.
3. Stop and wait for the user to pick what to fix.

---

You are auditing one branch of the seedcord monorepo, the repository in your working directory. Be adversarial: your job is to find what is wrong, not to confirm that things are fine. Do not use subagents or the Agent tool. Do the whole audit yourself. Do not edit, stage, or commit anything. This is read-only.

## Scope

Everything the current branch changes against its base: `git diff $(git merge-base HEAD next)...HEAD` plus any uncommitted changes, staged or not (`git status`, `git diff HEAD`). `git status` lists untracked files too, so read those as well. Read every changed file in full, not only the hunks, and open whatever those files import or are imported by when a finding depends on it.

## Ground truth, read these first, top to bottom

- `~/.claude/CLAUDE.md` (global rules) and the repo's `AGENTS.md` (CLAUDE.md symlinks to it), plus `packages/AGENTS.md`.
- The skills under `.github/skills/`: `code-quality/` (every file in it), `code-commenting-guidelines/SKILL.md`, `writing-voice/SKILL.md`, `guide-voice/SKILL.md` (and its PROSE-REVIEW.md), `tdd/` (every file in it), `changeset-guidelines/SKILL.md`.
- For code structure questions (who calls what, whether an export has consumers), use the codebase-memory MCP tools (load them with ToolSearch, call `list_projects`, and use the project whose root path is this checkout) and then read the source to confirm. For text in non-code files, plain reads are fine.
- The package's own README and its `package.json` exports map define the public surface.

Treat those files as the rules. Do not substitute your own taste where they already decide something, and do not invent rules they don't state.

## Audits to run

1. Adversarial: bugs, wrong behavior, edge cases that break, claims in code, comments, docs, or changesets that are false. Try to break it. Where you can, prove a behavior claim by running the package's tests or a small script (`pnpm -C <pkg> exec vitest run <file>`, node one-liners), rather than reasoning about it.
2. Code quality per the code-quality skill.
3. Comments per code-commenting-guidelines, and all prose (comments, README, changesets, CLI output text, error messages) per writing-voice and guide-voice. Apply them at their strictest.
4. Tests per the tdd skill. Specifically hunt for:
    - bogus tests that would pass even if the behavior broke
    - tests that don't check behavior
    - tests that exist only to add to the count
    - tests that are purely tautological
    - tests that assert on constants or static hardcoded strings rather than behavior
5. Overengineering.
6. YAGNI.
7. Exports: every export added or changed, whether anything outside its file uses it, whether it belongs on the public surface, and whether the package.json exports map and README agree.

## Output

Return a single list of findings, most severe first. For each finding give:

- severity (bug / should-fix / nit)
- which audit it came from
- file:line
- what is wrong, stated as a fact
- the evidence (a quote, a command you ran and its output, or the rule it breaks with the skill file and section)
- the fix

Mark each finding CONFIRMED if you verified it by running something or by reading both ends in the source, or SUSPECTED if you reasoned it out without verifying. For each audit that found nothing, say so in one line so it's clear it ran. Keep the list tight and skip praise.
