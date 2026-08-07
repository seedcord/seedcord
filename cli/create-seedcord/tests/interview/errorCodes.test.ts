import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { runFlow } from '@interview/runFlow';
import { botColorStep } from '@interview/steps/botColor';
import { capabilitiesStep } from '@interview/steps/capabilities';
import { directoryStep } from '@interview/steps/directory';
import { publicKeyStep } from '@interview/steps/publicKey';
import { tokenStep } from '@interview/steps/token';
import { transportStep } from '@interview/steps/transport';

import type { Step } from '@interview/types';

function thrownBy(run: () => unknown): unknown {
    try {
        run();
    } catch (error) {
        return error;
    }

    return undefined;
}

describe('a rejected flag value', () => {
    const rejects: [flag: string, run: () => unknown, reason: string][] = [
        ['dir', () => directoryStep.flag.parse('   '), 'cannot be empty'],
        ['transport', () => transportStep.flag.parse('websocket'), 'websocket'],
        ['capabilities', () => capabilitiesStep.flag.parse('telepathy'), 'telepathy'],
        ['token', () => tokenStep.flag.parse('aaa.bbb'), 'Bot page'],
        ['public-key', () => publicKeyStep.flag.parse('abc'), '64 hex'],
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
        const publicKey: Step<'publicKey'> = {
            key: 'publicKey',
            flag: { name: 'public-key', description: 'a stub', parse: (raw) => raw },
            skip: (answers) => answers.transport === 'gateway',
            ask: () => Promise.resolve('prompted')
        };

        const thrown = await runFlow(
            [publicKey],
            { transport: 'gateway', publicKey: 'supplied' },
            { interactive: true }
        ).catch((error: unknown) => error);

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateFlagNotApplicable)).toBe(true);
        expect((thrown as Error).message).toContain('public-key');
    });
});
