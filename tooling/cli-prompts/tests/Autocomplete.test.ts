import { describe, expect, it } from 'vitest';

import { KEY, PromptTerminal } from '#src/PromptTerminal';

const COLORS = {
    message: 'Pick an accent color, or type a hex',
    placeholder: 'Blurple',
    choices: ['Blurple', 'Aqua', 'Green', 'Yellow'].map((name) => ({ value: name, label: name }))
};

describe('Prompter.autocomplete', () => {
    it('filters as you type and answers with the highlighted match', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.autocomplete(COLORS);

        await terminal.press(...'yel', KEY.enter);

        await expect(answer).resolves.toBe('Yellow');
    });

    it('lists the typed choice above the matches', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.autocomplete({
            ...COLORS,
            typedChoice: (typed: string) => ({ value: `custom ${typed}`, label: typed })
        });

        await terminal.press(...'blur', KEY.enter);

        await expect(answer).resolves.toBe('custom blur');
    });
});
