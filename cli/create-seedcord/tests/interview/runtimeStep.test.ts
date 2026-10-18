import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseInput } from '#cli/parseInput';
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

describe('the runtime step under bun', () => {
    beforeEach(() => {
        vi.stubEnv('npm_config_user_agent', 'bun/1.4.2 npm/? node/v24.11.0 darwin arm64');
    });
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('makes an edge bot', () => {
        expect(parseInput(['my-bot', '--transport', 'http', '--runtime', 'edge']).runtime).toBe('edge');
    });
});
