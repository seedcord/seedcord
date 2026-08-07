import type { AnyStep, Answers } from './types';

export async function runFlow(steps: AnyStep[], supplied: Partial<Answers>): Promise<Partial<Answers>> {
    const answers: Partial<Answers> = { ...supplied };

    for (const step of steps) {
        if (step.skip?.(answers)) continue;
        if (answers[step.key] !== undefined) continue;

        // justified: Step<Key> correlates its key with its answer type, the Record cast indexes with the runtime key
        (answers as Record<keyof Answers, unknown>)[step.key] = await step.ask(answers);
    }

    return answers;
}
