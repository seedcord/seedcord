import { KEY, PromptTerminal, settled } from '@seedcord/cli-prompts/testing';
import { describe, expect, it } from 'vitest';

import { tokenStep } from '#interview/steps/token';
import { BOT_TOKEN, TOKEN } from '#tests/token';

describe('the token question', () => {
    it('answers null on the second empty Enter', async () => {
        using terminal = new PromptTerminal();
        const answer = tokenStep.ask({}, terminal.prompter);

        await terminal.press(KEY.enter);
        await settled(async () => expect(await terminal.screen()).toContain('Press Enter again'));
        await terminal.press(KEY.enter);

        await expect(answer).resolves.toBeNull();
    });

    it('stays open on a paste that is not the right shape', async () => {
        using terminal = new PromptTerminal();
        const answer = tokenStep.ask({}, terminal.prompter);

        await terminal.press('not it', KEY.enter);
        await settled(async () => expect(await terminal.screen()).toContain('Bot page'));

        await terminal.press(KEY.ctrlU, TOKEN, KEY.enter);
        await expect(answer).resolves.toEqual(BOT_TOKEN);
    });

    it('trims the spaces a copy paste picked up', async () => {
        using terminal = new PromptTerminal();
        const answer = tokenStep.ask({}, terminal.prompter);

        await terminal.press(` ${TOKEN} `, KEY.enter);

        await expect(answer).resolves.toEqual(BOT_TOKEN);
    });
});
