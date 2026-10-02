import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { AnyStep, Answers } from './types';

export function laterFlagName(name: string): string {
    return `no-${name}`;
}

export function applyFlags(steps: AnyStep[], raw: Record<string, string | boolean>): Partial<Answers> {
    const answers: Partial<Answers> = {};
    // justified: Step<Key> ties each key to its own parser return, and only a key that takes null has later
    const assign = answers as Record<keyof Answers, unknown>;

    for (const step of steps) {
        const value = raw[step.flag.name];
        const laterName = laterFlagName(step.flag.name);
        const later = step.flag.later !== undefined && raw[laterName] === true;

        if (later && value !== undefined) {
            throw new SeedcordError(SeedcordErrorCode.CreateBadUsage, [
                `Pass --${step.flag.name} or --${laterName}, not both.`
            ]);
        }

        if (later) assign[step.key] = null;
        else if (typeof value === 'string') assign[step.key] = step.flag.parse(value);
    }

    return answers;
}
