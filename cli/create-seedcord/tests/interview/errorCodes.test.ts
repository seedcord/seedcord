import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { runFlow } from '#interview/runFlow';
import { botColorStep } from '#interview/steps/botColor';
import { capabilitiesStep } from '#interview/steps/capabilities';
import { directoryStep } from '#interview/steps/directory';
import { runtimeStep } from '#interview/steps/runtime';
import { testingGuildsStep } from '#interview/steps/testingGuilds';
import { tokenStep } from '#interview/steps/token';
import { transportStep } from '#interview/steps/transport';
import { thrownBy } from '#tests/thrownBy';

describe('a rejected flag value', () => {
    const rejects: [flag: string, run: () => unknown, reason: string][] = [
        ['dir', () => directoryStep.flag.parse('   '), 'cannot be empty'],
        ['transport', () => transportStep.flag.parse('websocket'), 'websocket'],
        ['runtime', () => runtimeStep.flag.parse('lambda'), 'lambda'],
        ['capabilities', () => capabilitiesStep.flag.parse('telepathy'), 'telepathy'],
        ['token', () => tokenStep.flag.parse('aaa.bbb'), 'Bot page'],
        ['testing-guilds', () => testingGuildsStep.flag.parse('my-server'), 'my-server'],
        ['color', () => botColorStep.flag.parse('chartreuse'), 'chartreuse']
    ];

    it.each(rejects)('names --%s and keeps its reason', (flag, run, reason) => {
        const thrown = thrownBy(run);

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateInvalidAnswer)).toBe(true);
        expect((thrown as Error).message).toContain(`--${flag}`);
        expect((thrown as Error).message).toContain(reason);
    });
});

describe('a flag answering a skipped question', () => {
    it('throws its own code, separate from a rejected value', async () => {
        const thrown = await runFlow(
            [capabilitiesStep],
            { transport: 'http', capabilities: ['reactions'] },
            { interactive: false }
        ).catch((error: unknown) => error);

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateFlagNotApplicable)).toBe(true);
        expect((thrown as Error).message).toContain('capabilities');
    });
});
