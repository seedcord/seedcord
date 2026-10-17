import { describe, expect, it } from 'vitest';

import { KEY, PromptTerminal } from '#src/PromptTerminal';
import { settled } from '#src/settled';

const FAKE_TOKEN = `${'a'.repeat(26)}.${'b'.repeat(6)}.${'c'.repeat(38)}`;

const SKIP_WARNING = 'Nothing pasted. Press Enter again to leave it empty.';
const SKIPPABLE_TOKEN = { message: 'Paste your bot token', emptyWarning: SKIP_WARNING };

describe('Prompter.password', () => {
    it('resolves what you pasted and shows only bullets', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.password({ message: 'Paste your bot token' });

        await terminal.press(FAKE_TOKEN);
        await settled(async () => {
            const screen = await terminal.screen();
            expect(screen).toContain('•'.repeat(FAKE_TOKEN.length));
            expect(screen).not.toContain('aaaa');
        });

        await terminal.press(KEY.enter);
        await expect(answer).resolves.toBe(FAKE_TOKEN);
    });

    it('answers empty on a second empty enter while the warning shows', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.password(SKIPPABLE_TOKEN);

        await terminal.press(KEY.enter);
        await settled(async () => expect(await terminal.screen()).toContain(SKIP_WARNING));
        await terminal.press(KEY.enter);

        await expect(answer).resolves.toBe('');
    });

    it('counts a paste of only spaces as empty', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.password(SKIPPABLE_TOKEN);

        await terminal.press('   ', KEY.enter);
        await settled(async () => expect(await terminal.screen()).toContain(SKIP_WARNING));
        await terminal.press(KEY.enter);

        await expect(answer).resolves.toBe('');
    });

    it('warns again when you type and clear the field before the next enter', async () => {
        using terminal = new PromptTerminal();
        const answer = terminal.prompter.password(SKIPPABLE_TOKEN);

        await terminal.press(KEY.enter, 'a', KEY.backspace, KEY.enter);

        await settled(async () => expect(await terminal.screen()).toContain(SKIP_WARNING));
        await terminal.press(KEY.enter);
        await expect(answer).resolves.toBe('');
    });
});
