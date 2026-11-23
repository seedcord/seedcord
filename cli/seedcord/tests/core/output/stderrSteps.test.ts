import { describe, expect, it } from 'vite-plus/test';

import { stderrSteps } from '#core/output/stderrSteps';
import { fakeTerminal } from '#tests/fakeTerminal';

describe('stderrSteps', () => {
    it('moves what a step prints to stderr and returns its result', async () => {
        const stdout = fakeTerminal();
        const stderr = fakeTerminal();

        const result = await stderrSteps(stdout, stderr).step('load bot', () => {
            stdout.write('loading the bot\n');
            return Promise.resolve(42);
        });

        expect(result).toBe(42);
        expect(stdout.text()).toBe('');
        expect(stderr.text()).toBe('loading the bot\n');
    });
});
