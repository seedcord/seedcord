import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { noFlagName } from './applyFlags';

import type { AnyStep, Answers } from './types';

function unansweredReason(step: AnyStep): string {
    const reason = 'Required when there is no terminal to ask on.';
    if (step.flag.noFlag === undefined) return reason;

    return `${reason} Pass --${noFlagName(step.flag.name)} to fill it in .env later.`;
}

export async function runFlow(
    steps: AnyStep[],
    supplied: Partial<Answers>,
    options: { interactive: boolean }
): Promise<Partial<Answers>> {
    const answers: Partial<Answers> = { ...supplied };

    for (const step of steps) {
        if (step.skip?.(answers)) {
            if (step.key in supplied) {
                const flag = supplied[step.key] === null ? noFlagName(step.flag.name) : step.flag.name;
                throw new SeedcordError(SeedcordErrorCode.CreateFlagNotApplicable, [flag]);
            }
            continue;
        }
        if (answers[step.key] !== undefined) continue;

        if (!options.interactive) {
            throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [step.flag.name, unansweredReason(step)]);
        }

        // justified: Step<Key> ties each key to its own answer type
        (answers as Record<keyof Answers, unknown>)[step.key] = await step.ask(answers);
    }

    return answers;
}
