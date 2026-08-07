import type { AnyStep, Answers } from './types';

export function applyFlags(steps: AnyStep[], raw: Record<string, string>): Partial<Answers> {
    const answers: Partial<Answers> = {};

    for (const step of steps) {
        const value = raw[step.flag.name];
        if (value === undefined) continue;

        // justified: Step<Key> correlates its key with its parser's return, the Record cast indexes with the runtime key
        (answers as Record<keyof Answers, unknown>)[step.key] = step.flag.parse(value);
    }

    return answers;
}
