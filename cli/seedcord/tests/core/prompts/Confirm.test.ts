import { describe, expect, it } from 'vitest';

import { KEY, PromptTerminal } from './promptTerminal';

const DELETE = { message: 'Delete 3 guild commands? This cannot be undone.' };

describe('Prompter.confirm', () => {
    it('answers no when enter comes first', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.confirm(DELETE);

        await terminal.press(KEY.enter);

        await expect(answer).resolves.toBe(false);
    });

    it.each([
        ['← flips to yes', [KEY.left], true],
        ['↓ flips to yes', [KEY.down], true],
        ['a second ← flips back to no', [KEY.left, KEY.left], false],
        ['↑ then → flips there and back', [KEY.up, KEY.right], false],
        ['y picks yes', ['y'], true],
        ['n after y picks no', ['y', 'n'], false]
    ])('%s', async (_name, keys, expected) => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.confirm(DELETE);

        await terminal.press(...keys, KEY.enter);

        await expect(answer).resolves.toBe(expected);
    });
});
