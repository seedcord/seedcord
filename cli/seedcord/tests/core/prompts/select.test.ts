import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { KEY, PromptTerminal } from './promptTerminal';

const WHICH_GUILDS = {
    message: 'Which guilds?',
    choices: [
        { value: 'pick', label: 'Pick specific guilds' },
        { value: 'all', label: 'All guilds the bot is in' }
    ]
} as const;

describe('Prompter.select', () => {
    it('resolves the value of the highlighted choice on enter', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.select(WHICH_GUILDS);

        terminal.press(KEY.down, KEY.enter);

        await expect(answer).resolves.toBe('all');
    });

    it('wraps from the first choice to the last on up', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.select(WHICH_GUILDS);

        terminal.press(KEY.up, KEY.enter);

        await expect(answer).resolves.toBe('all');
    });

    it('hands its rows back to whatever prints next', async () => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.select(WHICH_GUILDS);

        terminal.press(KEY.enter);
        await answer;
        terminal.print('next');

        expect(await terminal.screen()).toBe('next');
    });

    it.each([
        ['Ctrl+C', KEY.ctrlC],
        ['Esc', KEY.escape]
    ])('throws CliCancelled on %s', async (_name, key) => {
        const terminal = new PromptTerminal();
        const answer = terminal.prompter.select(WHICH_GUILDS);

        terminal.press(key);

        await expect(answer).rejects.toMatchObject({ code: SeedcordErrorCode.CliCancelled });
    });
});
