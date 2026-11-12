---
name: branch-audit
description: Adversarial read-only audit of the current branch against its base, run by a separate agent, followed by a review loop with the user. Run it before every push, and again after fixes until a round finds only nits.
argument-hint: '[opus|sonnet|fable] [instructions]'
disable-model-invocation: true
---

Run an adversarial audit of the current branch through a separate agent, check its findings, rule on them with the user, then fix what the user approves.

## Sending the audit

The first word of the arguments picks the auditor's model: `opus`, `sonnet`, or `fable`, default `opus`. Anything after it is an instruction from the user, like `x2` for two auditors in parallel, "in their own worktrees", or "diff against plugin-tasks". Follow it.

Spawn the auditor as a subagent with its model set explicitly, in the background. An agent without subagents opens a fresh session for the auditor, or asks the user to.

Give the auditor the prompt below the line, word for word. Add only these:

- The base branch, when it isn't `next`.
- From the second round on, the rulings from earlier rounds, each with its reason: "Raise one of these again only if you quote evidence that the reason is wrong."
- Anything the user asks you to add.

Never add file hints or suspected findings.

## When it finishes

1. Reproduce every CONFIRMED finding against the source or the built output before calling it real. Check SUSPECTED ones the same way where the answer changes what gets fixed. For a finding you can't settle by reading, run a spike with numbers, like a benchmark or a small script.
2. Push back where the auditor is wrong. Reject a finding with the `file:line` that disproves it. A ruling from an earlier round doesn't make it right either. When new evidence shows the ruling was wrong, say so.
3. Present the findings in a message of their own: a table with a verdict for each (fix, reject, or the user's call), the evidence, and a number to refer to it by. Findings the user ruled on in an earlier round go in a second table below, labeled with that ruling and its reason. Prose findings go in their own list under the tables and skip the questions in step 4. The user says which ones to leave, and the rest get fixed after the go. Then stop. The user reads the table, asks about numbers, and says when to ask.
4. Collect the decisions with a multiple-choice question tool, in rounds of at most four questions. Without one, ask the same questions as a numbered list.
    - First, one question per "user's call" finding. Each option gets one or two sentences of context, so the user can decide from the question alone. List the recommended pick first, marked "(Recommended)".
    - Then multi-select questions asking "Which rejections should be fixed instead?" and "Which earlier rulings do you want to reopen?". A question holds two to four options, so split a longer list across several questions. A single finding gets its own two-option question instead, keep or change. Picking an option changes its verdict, so an empty answer keeps every verdict.
    - Each reopened ruling gets its own question with the verdicts it can switch to, so a past fix can become a reject too.
    - When the user doesn't understand a finding, explain it in plain words and ask about it again on its own.
5. Wait for the user to say go. Don't edit anything before that.
6. Fix the approved findings at the root, in chunks the user can review and commit. Run the checks for what each chunk touched.
7. Before handing over each chunk, read its whole diff as a reviewer hunting for patchwork in someone else's code. Find every question the diff asks in more than one place, and ask it once instead. For each guard or fallback you added, name the input that reaches it, or delete it. Back every "X can't do Y" you relied on with a doc or source line.
8. Once the loop is done, say whether another round is worth it and why. Another round is worth it when the fixes changed logic or refactored code, because the new code hasn't been audited. Stop when the last round found only nits, or when the remaining change is small and already verified.

---

You are auditing one branch of the seedcord monorepo, the repository in your working directory. Be adversarial: your job is to find what is wrong, not to confirm that things are fine. Do not use subagents. Do the whole audit yourself. Do not edit, stage, or commit anything. This is read-only.

## Scope

Everything the current branch changes against its base: `git diff $(git merge-base HEAD <base>)...HEAD`, where the base is `next` unless the message that sent you names another, plus any uncommitted changes, staged or not (`git status`, `git diff HEAD`). `git status` lists untracked files too, so read those as well. Read every changed file in full, not only the hunks, and open whatever those files import or are imported by when a finding depends on it.

## Ground truth, read these first, top to bottom

- The repo's `AGENTS.md` (CLAUDE.md symlinks to it), plus `packages/AGENTS.md` and `apps/AGENTS.md`.
- The skills under `.agents/skills/`: `code-quality/` (every file in it), `code-commenting-guidelines/SKILL.md`, `writing-voice/SKILL.md`, `guide-voice/SKILL.md` (and its PROSE-REVIEW.md), `tdd/` (every file in it), `test-performance/SKILL.md`, `changeset-guidelines/SKILL.md`.
- For code structure claims (who calls what, whether an export has consumers), find the callers and importers, then read both ends before you report.
- The package's own README and its `package.json` exports map define the public surface.

Treat those files as the rules. Do not substitute your own taste where they already decide something, and do not invent rules they don't state.

## Audits to run

1. Adversarial: bugs, wrong behavior, edge cases that break, claims in code, comments, docs, or changesets that are false. Try to break it. Where you can, prove a behavior claim by running the package's tests or a small script (`vp -C <pkg> test run <file>`, node one-liners), rather than reasoning about it.
2. Code quality per the code-quality skill.
    - For example, if any justified casts are easy ways out of properly narrowing types
    - Any types that have been hacked on instead of derived properly
    - Code that's adding a new feature or fix as a patch rather than fix the underlying root cause, or sometimes a design flaw
    - More things that the skill mentions
3. Comments per code-commenting-guidelines, and all prose (comments, README, changesets, CLI output text, error messages) per writing-voice and guide-voice. Apply them at their strictest.
    - Any comments that could be removed by using better names, refactoring, or code structure.
    - Any comments that are justifying bad code or design choices. The bad code should be refactored from the root rather than explained away.
    - Any new sentence that could be simpler, even if it follows every rule. Compare it to the simplest way to say the same fact.
4. Tests per the tdd skill. Specifically hunt for:
    - bogus tests that would pass even if the behavior broke
    - tests that don't check behavior
    - tests that exist only to add to the count
    - tests that are purely tautological
    - tests that assert on constants or static hardcoded strings rather than behavior
    - tests that are doing the same and heavy work multiple times when they could be consolidated or optimized
        - check the test optimization guidelines
5. Overengineering.
6. YAGNI.
7. Exports: every export added or changed, whether anything outside its file uses it, whether it belongs on the public surface, and whether the package.json exports map and README match.
8. Code that's staggered across functions that could be consolidated for clarity and maintainability by refactoring into an OOP-based design.
9. Refactors: if the changes read as a set of patches, list each patch with its file:line and propose the refactor that would replace them, with its scope.
    - A member handled outside the structure its siblings use: a flag, a field, a branch, or a copied rule that gives one item a behavior the others get from the existing model (a phase, a registry, a pipeline). Name the structure it belongs in.

## Output

Return a single list of findings, most severe first. For each finding give:

- severity (bug / should-fix / nit)
- which audit it came from
- file:line
- what is wrong, stated as a fact
- the evidence (a quote, a command you ran and its output, or the rule it breaks with the skill file and section)
- the fix

Put wording findings in a second list after that one. For each, give the file:line, the sentence, and a simpler version. List every one, and don't sample.

Mark each finding CONFIRMED if you verified it by running something or by reading both ends in the source, or SUSPECTED if you reasoned it out without verifying. For each audit that found nothing, say so in one line so it's clear it ran. Keep the list tight and skip praise.
