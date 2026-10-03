import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { AnyStep, Answers } from './types';

export function noFlagName(name: string): string {
    return `no-${name}`;
}

export function applyFlags(steps: AnyStep[], raw: Record<string, string | boolean>): Partial<Answers> {
    const answers: Partial<Answers> = {};
    // justified: Step<Key> ties each key to its own parser return
    const assign = answers as Record<keyof Answers, unknown>;

    for (const step of steps) {
        const value = raw[step.flag.name];
        const noName = noFlagName(step.flag.name);
        const answeredNull = step.flag.noFlag !== undefined && raw[noName] === true;

        if (answeredNull && value !== undefined) {
            throw new SeedcordError(SeedcordErrorCode.CreateBadUsage, [
                `Pass --${step.flag.name} or --${noName}, not both.`
            ]);
        }

        if (answeredNull) assign[step.key] = null;
        else if (typeof value === 'string') assign[step.key] = step.flag.parse(value);
    }

    return answers;
}
