import { KEY, PromptTerminal } from '@seedcord/cli-prompts/testing';
import { describe, expect, it } from 'vitest';

import { botColorStep } from '#interview/steps/botColor';

describe('the color question', () => {
    it('picks Blurple on Enter with nothing typed', async () => {
        using terminal = new PromptTerminal();
        const answer = botColorStep.ask({}, terminal.prompter);

        await terminal.press(KEY.enter);

        await expect(answer).resolves.toBe('Blurple');
    });

    it('offers a typed hex first, lowercased', async () => {
        using terminal = new PromptTerminal();
        const answer = botColorStep.ask({}, terminal.prompter);

        await terminal.press('#FE565A', KEY.enter);

        await expect(answer).resolves.toBe('#fe565a');
    });
});
