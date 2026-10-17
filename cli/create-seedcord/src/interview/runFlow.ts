import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { noFlagName } from './applyFlags';

import type { AnyStep, Answers, Step } from './types';
import type { Prompter } from '@seedcord/cli-prompts';

function unansweredReason<Key extends keyof Answers>({ flag }: Step<Key>): string {
    const reason = 'Required when there is no terminal to ask on.';
    if (flag.noFlag === undefined) return reason;

    return `${reason} Pass --${noFlagName(flag.name)} to ${flag.noFlag}.`;
}

export type FlowMode =
    | { readonly interactive: false }
    | {
          readonly interactive: true;
          readonly prompter: Prompter;
          readonly onAnswer: (label: string, shown: string) => void;
      };

async function answerFor<Key extends keyof Answers>(
    step: Step<Key>,
    answers: Partial<Answers>,
    options: FlowMode
): Promise<Answers[Key]> {
    if (options.interactive) {
        const answer = await step.ask(answers, options.prompter);
        options.onAnswer(step.label, step.shown(answer));
        return answer;
    }

    if (step.answerWithoutTerminal !== undefined) return step.answerWithoutTerminal;

    throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [step.flag.name, unansweredReason(step)]);
}

export async function runFlow(
    steps: AnyStep[],
    supplied: Partial<Answers>,
    options: FlowMode
): Promise<Partial<Answers>> {
    const answers: Partial<Answers> = { ...supplied };

    for (const step of steps) {
        if (step.skip?.(answers)) {
            if (step.key in supplied) {
                throw new SeedcordTypeError(SeedcordErrorCode.CreateFlagNotApplicable, [step.flag.name]);
            }
            continue;
        }
        if (answers[step.key] !== undefined) continue;

        // justified: Step<Key> ties each key to its own answer type
        (answers as Record<keyof Answers, unknown>)[step.key] = await answerFor(
            step as Step<keyof Answers>,
            answers,
            options
        );
    }

    return answers;
}
