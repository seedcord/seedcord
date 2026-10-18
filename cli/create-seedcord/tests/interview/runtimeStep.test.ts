import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { runFlow } from '#interview/runFlow';
import { runtimeStep } from '#interview/steps/runtime';

const NO_TERMINAL = { interactive: false } as const;

describe('the runtime step', () => {
    it('makes a server bot when nothing picks the runtime and there is no terminal', async () => {
        const answers = await runFlow([runtimeStep], { transport: 'http' }, NO_TERMINAL);

        expect(answers.runtime).toBe('server');
    });

    it('refuses --runtime on a gateway bot', async () => {
        const thrown = await runFlow([runtimeStep], { transport: 'gateway', runtime: 'edge' }, NO_TERMINAL).catch(
            (error: unknown) => error
        );

        expect(isSeedcordError(thrown, undefined, SeedcordErrorCode.CreateFlagNotApplicable)).toBe(true);
    });
});
