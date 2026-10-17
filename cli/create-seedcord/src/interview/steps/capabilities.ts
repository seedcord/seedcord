import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { CAPABILITIES, isPrivileged } from '#interview/capabilities';

import type { Step } from '#interview/types';

function parseCapabilities(raw: string): string[] {
    const ids = raw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id !== '');

    for (const id of ids) {
        if (!CAPABILITIES.some((capability) => capability.id === id)) {
            throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
                'capabilities',
                `Unknown capability "${id}". Run with --help for the list.`
            ]);
        }
    }

    return ids;
}

function optionLabel(id: string, label: string): string {
    return isPrivileged(id) ? `${label} ${paint.amber('privileged')}` : label;
}

function labelOf(id: string): string {
    return CAPABILITIES.find((capability) => capability.id === id)?.label ?? id;
}

export const capabilitiesStep: Step<'capabilities'> = {
    key: 'capabilities',
    label: 'events',
    flag: {
        name: 'capabilities',
        description: `a comma separated list of ${CAPABILITIES.map((capability) => capability.id).join(', ')}`,
        parse: parseCapabilities
    },
    skip: (answers) => answers.transport === 'http',
    ask: (_answers, prompter) =>
        prompter.checklist({
            message: 'What should your bot react to?',
            choices: CAPABILITIES.map((capability) => ({
                value: capability.id,
                label: optionLabel(capability.id, capability.label),
                hint: capability.hint
            }))
        }),
    shown: (ids) => (ids.length === 0 ? paint.mute('none') : ids.map(labelOf).join(', '))
};
