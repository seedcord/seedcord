import { describe, expect, it } from 'vitest';

import { KEY, PromptTerminal } from '#src/PromptTerminal';

const SPACE = ' ';

const EVENTS = {
    message: 'What should your bot react to?',
    choices: [
        { value: 'guild-messages', label: 'Messages in servers' },
        { value: 'direct-messages', label: 'Direct messages' },
        { value: 'reactions', label: 'Reactions' }
    ]
};

describe('Prompter.checklist', () => {
    it('toggles the highlighted row on space and answers in list order', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.checklist(EVENTS);

        await terminal.press(KEY.down, KEY.down, SPACE, KEY.up, KEY.up, SPACE, KEY.enter);

        await expect(answer).resolves.toEqual(['guild-messages', 'reactions']);
    });
});
