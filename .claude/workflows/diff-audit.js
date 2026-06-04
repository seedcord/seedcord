export const meta = {
    name: 'diff-audit',
    description:
        'Audit the uncommitted diff with 2 code-quality + 2 comment-audit Opus agents (report/dry-run), then losslessly synthesize: apply the comment fixes, hand the code-quality findings back to the orchestrator.',
    whenToUse: 'Before committing. Operates on the current uncommitted working-tree diff only.',
    phases: [
        { title: 'Audit', detail: '2x code-quality + 2x comment-audit, parallel, Opus, no edits', model: 'opus' },
        {
            title: 'Synthesize',
            detail: 'lossless combine; apply comment fixes; emit code-quality findings',
            model: 'opus'
        }
    ]
};

const CQ = (
    label
) => `Skill: read .claude/skills/code-quality/SKILL.md and every sibling sub-file in that folder (FAIL-FAST-RULES, OOP, PREVENT-REINVENTION, REACT19, TAILWIND, TYPESCRIPT), in full.
Diffs: the uncommitted working-tree changes only. Run \`git --no-pager diff HEAD\`; include untracked files from \`git status --porcelain\` and read them in full. Ignore pnpm-lock.yaml.
Audit those diffs against the skill. Report mode: do NOT edit any file. Write every finding (file:line, rule, why, suggested fix) to .vscode/scratch/diff-audit/raw/${label}.md. Reply with only a one-line count.`;

const COMMENT = (
    label
) => `Skill: read .claude/skills/code-commenting-guidelines/SKILL.md and .claude/skills/writing-voice/SKILL.md in full.
Diffs: the uncommitted working-tree changes only. Run \`git --no-pager diff HEAD\`; include untracked files from \`git status --porcelain\` and read them in full. Ignore pnpm-lock.yaml.
Audit comment quality against the skill, super-strict, DRY-RUN: do NOT edit any file. For each issue write file:line, the current comment, the action (delete / rewrite), and the exact replacement text to .vscode/scratch/diff-audit/raw/${label}.md. Reply with only a one-line count.`;

const SYNTH = `Four reports exist in .vscode/scratch/diff-audit/raw/: two code-quality (cq-1.md, cq-2.md) and two comment-audit (comment-1.md, comment-2.md). Read all four.

1. Comment fixes: losslessly combine comment-1.md + comment-2.md (union, dedup exact duplicates, keep every unique finding). Re-read .claude/commands/comment-audit.md, then APPLY each fix to the source via Edit (comments only; no code-logic changes). Skip a proposed deletion only if the comment is load-bearing per the skill.
2. Code-quality findings: losslessly combine cq-1.md + cq-2.md (union, dedup, keep every unique finding) into .vscode/scratch/diff-audit/code-quality-findings.md, grouped by file, each as file:line, rule, why, suggested fix. Do NOT apply these.

Reply with: the comment fixes you applied (file:line each), and the count + path of the combined code-quality findings.`;

phase('Audit');
await parallel([
    () => agent(CQ('cq-1'), { label: 'code-quality-1', phase: 'Audit', model: 'opus', agentType: 'general-purpose' }),
    () => agent(CQ('cq-2'), { label: 'code-quality-2', phase: 'Audit', model: 'opus', agentType: 'general-purpose' }),
    () =>
        agent(COMMENT('comment-1'), {
            label: 'comment-audit-1',
            phase: 'Audit',
            model: 'opus',
            agentType: 'general-purpose'
        }),
    () =>
        agent(COMMENT('comment-2'), {
            label: 'comment-audit-2',
            phase: 'Audit',
            model: 'opus',
            agentType: 'general-purpose'
        })
]);

phase('Synthesize');
const result = await agent(SYNTH, {
    label: 'synthesize',
    phase: 'Synthesize',
    model: 'opus',
    agentType: 'general-purpose'
});

log(
    'diff-audit done: comment fixes applied; code-quality findings in .vscode/scratch/diff-audit/code-quality-findings.md'
);
return result;
