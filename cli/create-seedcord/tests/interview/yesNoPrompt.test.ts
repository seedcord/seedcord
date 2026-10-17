import { KEY, PromptTerminal } from '@seedcord/cli-prompts/testing';
import { describe, expect, it } from 'vitest';

import { gitStep, installStep } from '#interview/steps/yesNo';

describe.each([installStep, gitStep])('the $key question', (step) => {
    it('answers yes on Enter', async () => {
        using terminal = new PromptTerminal();
        const answer = step.ask({}, terminal.prompter);

        await terminal.press(KEY.enter);

        await expect(answer).resolves.toBe(true);
    });

    it('answers no once you move down to it', async () => {
        using terminal = new PromptTerminal();
        const answer = step.ask({}, terminal.prompter);

        await terminal.press(KEY.down, KEY.enter);

        await expect(answer).resolves.toBe(false);
    });
});
