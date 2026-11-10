import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';

const HOOK = fileURLToPath(new URL('../src/hook.ts', import.meta.url));
const ROOT = new URL('../../../', import.meta.url);
const TEMP = new URL('temp/', import.meta.url);
const EDITED = fileURLToPath(new URL('edited.md', TEMP));

// a second git checkout, like a worktree a session created after it started somewhere else
const OTHER = new URL('other/', TEMP);
const OTHER_PAGE = fileURLToPath(new URL('page.md', OTHER));

// a committed file with these phrases would fail the pre-commit hook
const PAGE = `# Edited

Before the edit the job stays untouched.

After a restart the job fails loudly.

The handler carries the route id.

After a restart the job fails loudly.
`;

// the patch shape Claude Code reports for an Edit
const editAt = (file: string, line: number, text: string): string =>
    runHook({
        tool_name: 'Edit',
        tool_input: { file_path: file, new_string: text },
        tool_response: { structuredPatch: [{ newStart: line, lines: [`+${text}`] }] }
    });

function runHook(payload: object): string {
    return execFileSync('node', [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' });
}

beforeAll(() => {
    mkdirSync(OTHER, { recursive: true });
    writeFileSync(EDITED, PAGE);

    execFileSync('git', ['init', '--quiet'], { cwd: OTHER });
    symlinkSync(fileURLToPath(new URL('node_modules', ROOT)), fileURLToPath(new URL('node_modules', OTHER)));
    writeFileSync(
        new URL('.vale.ini', OTHER),
        `StylesPath = ${fileURLToPath(new URL('tooling/prose/vale', ROOT))}\n\n[*.md]\nBasedOnStyles = Seedcord\nSeedcord.StandIn = NO\n`
    );
    writeFileSync(OTHER_PAGE, 'The job stays untouched.\n');
});

afterAll(() => {
    rmSync(TEMP, { recursive: true, force: true });
});

describe('prose hook', () => {
    it('blocks on an error in the lines the edit wrote, even when the same text sits earlier', () => {
        const { decision, reason } = JSON.parse(editAt(EDITED, 9, 'After a restart the job fails loudly.')) as {
            decision: string;
            reason: string;
        };

        expect(decision).toBe('block');
        expect(reason.match(/^- \d+ .*$/gm)).toEqual([expect.stringMatching(/^- 9 error Seedcord\.Banned:/)]);
    });

    it('passes a suggestion back as context without blocking', () => {
        const output = JSON.parse(editAt(EDITED, 7, 'The handler carries the route id.')) as {
            decision?: string;
            hookSpecificOutput: { additionalContext: string };
        };

        expect(output.decision).toBeUndefined();
        expect(output.hookSpecificOutput.additionalContext).toMatch(/^- 7 suggestion Seedcord\.\w+:/m);
    });

    it("lints a new file in another checkout with that checkout's own config", () => {
        const created = runHook({
            tool_name: 'Write',
            tool_input: { file_path: OTHER_PAGE, content: 'The job stays untouched.\n' },
            tool_response: { type: 'create', structuredPatch: [] }
        });

        expect(created).toBe('');
    });
});
