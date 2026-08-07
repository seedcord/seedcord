import { multiselect } from '@clack/prompts';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { CAPABILITIES } from '../capabilities';
import { requireAnswer } from './requireAnswer';

import type { Step } from '../types';

function parseCapabilities(raw: string): string[] {
    const ids = raw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '');

    for (const id of ids) {
        if (!CAPABILITIES.some((capability) => capability.id === id)) {
            throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [
                'capabilities',
                `Unknown capability "${id}". Run with --help for the list.`
            ]);
        }
    }

    return ids;
}

export const capabilitiesStep: Step<'capabilities'> = {
    key: 'capabilities',
    flag: {
        name: 'capabilities',
        description: `a comma separated list of ${CAPABILITIES.map((capability) => capability.id).join(', ')}`,
        parse: parseCapabilities
    },
    skip: (answers) => answers.transport === 'http',
    ask: async () =>
        requireAnswer(
            await multiselect<string>({
                message: 'What should your bot react to?',
                options: CAPABILITIES.map((capability) => ({
                    value: capability.id,
                    label: capability.label,
                    hint: capability.hint
                })),
                required: false
            })
        )
};
