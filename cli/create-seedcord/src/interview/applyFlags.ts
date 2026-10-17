import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import type { AnyStep, Answers } from './types';

export function noFlagName(name: string): string {
    return `no-${name}`;
}

function flagAnswer({ flag }: AnyStep, raw: Record<string, string | boolean>): unknown {
    const value = raw[flag.name];
    const noName = noFlagName(flag.name);
    const turnedOff = flag.noFlag !== undefined && raw[noName] === true;

    if (turnedOff && value !== undefined) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateBadUsage, [
            `Pass --${flag.name} or --${noName}, not both.`
        ]);
    }

    if (!('parse' in flag)) return turnedOff ? false : value;
    if (turnedOff) return null;
    return typeof value === 'string' ? flag.parse(value) : undefined;
}

export function applyFlags(steps: AnyStep[], raw: Record<string, string | boolean>): Partial<Answers> {
    const answers: Partial<Answers> = {};

    for (const step of steps) {
        const answer = flagAnswer(step, raw);
        // justified: Step<Key> ties each key to its own flag
        if (answer !== undefined) (answers as Record<keyof Answers, unknown>)[step.key] = answer;
    }

    return answers;
}
