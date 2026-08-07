import type { AnyStep, Answers } from './types';

export function applyFlags(steps: AnyStep[], raw: Record<string, string>): Partial<Answers> {
    const answers: Partial<Answers> = {};

    for (const step of steps) {
        const value = raw[step.flag.name];
        if (value === undefined) continue;

        // justified: Step<Key> ties each key to its own parser return
        (answers as Record<keyof Answers, unknown>)[step.key] = step.flag.parse(value);
    }

    return answers;
}
