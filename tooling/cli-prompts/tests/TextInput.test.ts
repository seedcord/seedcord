import { describe, expect, it } from 'vitest';

import { KEY, PromptTerminal } from '#src/PromptTerminal';
import { settled } from '#src/settled';

const LOWERCASE = 'Use lowercase letters only.';

const FOLDER = {
    message: 'Where should the project go?',
    placeholder: 'my-bot',
    validate: (value: string): string | undefined => (/^[a-z-]+$/.test(value) ? undefined : LOWERCASE)
};

describe('Prompter.text', () => {
    it('resolves what you typed on enter', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.text(FOLDER);

        await terminal.press(...'my-bot', KEY.enter);

        await expect(answer).resolves.toBe('my-bot');
    });

    it('submits a paste that ends in enter', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.text(FOLDER);

        await terminal.press(`my-bot${KEY.enter}`);

        await expect(answer).resolves.toBe('my-bot');
    });

    it('stays open and shows the message validate returns', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.text(FOLDER);

        await terminal.press(...'My Bot', KEY.enter);
        await settled(async () => expect(await terminal.screen()).toContain(LOWERCASE));

        await terminal.press(KEY.ctrlU, ...'my-bot', KEY.enter);
        await expect(answer).resolves.toBe('my-bot');
    });

    it('hides the error once you type again', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.text(FOLDER);

        await terminal.press(...'My', KEY.enter);
        await settled(async () => expect(await terminal.screen()).toContain(LOWERCASE));
        await terminal.press(KEY.backspace);

        await settled(async () => expect(await terminal.screen()).not.toContain(LOWERCASE));
        await terminal.cancel(answer);
    });
});
