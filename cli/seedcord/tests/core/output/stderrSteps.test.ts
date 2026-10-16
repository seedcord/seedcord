import { describe, expect, it } from 'vitest';

import { stderrSteps } from '#core/output/stderrSteps';
import { pipedTerminal } from '#tests/commands/commands/fakeBot';

describe('stderrSteps', () => {
    it('moves what a step prints to stderr and returns its result', async () => {
        const stdout = pipedTerminal();
        const stderr = pipedTerminal();

        const result = await stderrSteps(stdout, stderr).step('load bot', () => {
            stdout.write('loading the bot\n');
            return Promise.resolve(42);
        });

        expect(result).toBe(42);
        expect(stdout.text()).toBe('');
        expect(stderr.text()).toBe('loading the bot\n');
    });
});
