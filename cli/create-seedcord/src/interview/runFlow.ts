import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { AnyStep, Answers } from './types';

export async function runFlow(
    steps: AnyStep[],
    supplied: Partial<Answers>,
    options: { interactive: boolean }
): Promise<Partial<Answers>> {
    const answers: Partial<Answers> = { ...supplied };

    for (const step of steps) {
        if (step.skip?.(answers)) {
            if (step.key in supplied) {
                throw new SeedcordError(SeedcordErrorCode.CreateFlagNotApplicable, [step.flag.name]);
            }
            continue;
        }
        if (answers[step.key] !== undefined) continue;

        if (!options.interactive) {
            throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [
                step.flag.name,
                'Required when there is no terminal to ask on.'
            ]);
        }

        // justified: Step<Key> ties each key to its own answer type
        (answers as Record<keyof Answers, unknown>)[step.key] = await step.ask(answers);
    }

    return answers;
}
