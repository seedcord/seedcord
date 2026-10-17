import { describe, expect, it } from 'vitest';

import { KEY, PromptTerminal } from '#src/PromptTerminal';

const DELETE = { message: 'Delete 3 guild commands? This cannot be undone.' };

describe('Prompter.confirm', () => {
    it('answers no when enter comes first', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.confirm(DELETE);

        await terminal.press(KEY.enter);

        await expect(answer).resolves.toBe(false);
    });

    it('starts on yes when asked to', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.confirm({ message: 'Install dependencies now?', initial: true });

        await terminal.press(KEY.enter);

        await expect(answer).resolves.toBe(true);
    });

    it.each([
        ['← flips to yes', [KEY.left], true],
        ['↓ flips to yes', [KEY.down], true],
        ['a second ← flips back to no', [KEY.left, KEY.left], false],
        ['↑ then → flips there and back', [KEY.up, KEY.right], false],
        ['y picks yes', ['y'], true],
        ['n after y picks no', ['y', 'n'], false],
        ['Y picks yes', ['Y'], true],
        ['N after Y picks no', ['Y', 'N'], false]
    ])('%s', async (_name, keys, expected) => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.confirm(DELETE);

        await terminal.press(...keys, KEY.enter);

        await expect(answer).resolves.toBe(expected);
    });
});
