import type { AnyStep, Answers } from './types';

export async function runFlow(steps: AnyStep[], supplied: Partial<Answers>): Promise<Partial<Answers>> {
    const answers: Partial<Answers> = { ...supplied };

    for (const step of steps) {
        if (step.skip?.(answers)) {
            if (step.key in supplied) {
                throw new Error(`The --${step.flag.name} flag does not apply to the answers you gave.`);
            }
            continue;
        }
        if (answers[step.key] !== undefined) continue;

        // justified: Step<Key> ties each key to its own answer type
        (answers as Record<keyof Answers, unknown>)[step.key] = await step.ask(answers);
    }

    return answers;
}
