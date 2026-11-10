import { describe, expect, it } from 'vite-plus/test';

import { KEY, PromptTerminal } from '#src/PromptTerminal';

const WHICH_GUILDS = {
    message: 'Which guilds?',
    choices: [
        { value: 'pick', label: 'Pick specific guilds' },
        { value: 'all', label: 'All guilds the bot is in' }
    ]
} as const;

describe('Prompter.select', () => {
    it('resolves the value of the highlighted choice on enter', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.select(WHICH_GUILDS);

        await terminal.press(KEY.down, KEY.enter);

        await expect(answer).resolves.toBe('all');
    });

    it('wraps from the first choice to the last on up', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.select(WHICH_GUILDS);

        await terminal.press(KEY.up, KEY.enter);

        await expect(answer).resolves.toBe('all');
    });

    it('clears its rows for whatever prints next', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.select(WHICH_GUILDS);

        await terminal.press(KEY.enter);
        await answer;
        terminal.print('next');

        expect(await terminal.screen()).toBe('next');
    });

    it('clears its rows when enter follows another key within one frame', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.select(WHICH_GUILDS);

        await terminal.press(KEY.down, KEY.enter);
        await answer;
        terminal.print('next');

        expect(await terminal.screen()).toBe('next');
    });

    it.each([
        ['Ctrl+C', KEY.ctrlC],
        ['Esc', KEY.escape]
    ])('throws CliCancelled on %s', async (_name, key) => {
        using terminal = new PromptTerminal();

        await terminal.cancel(terminal.prompter.select(WHICH_GUILDS), key);
    });
});
