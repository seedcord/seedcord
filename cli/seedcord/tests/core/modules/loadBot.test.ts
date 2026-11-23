import { describe, expect, it } from 'vite-plus/test';

import { loadBot } from '#core/modules/loadBot';
import { quietSteps } from '#core/output/quietSteps';
import { fakeProject } from '#tests/commands/commands/fakeBot';

describe('loadBot', () => {
    it('keeps the project open until the bot has loaded', async () => {
        const { instance } = await loadBot(quietSteps, await fakeProject(), '');

        expect(instance.config.bot.commands.path).toBe('./commands');
    });
});
