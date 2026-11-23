import { unlessCancelled } from '@seedcord/cli-prompts';
import { paint } from '@seedcord/errors';

import type { Confirm } from '#core/output/confirm';
import type { StepPrinter } from '#core/output/StepPrinter';
import type { Choice } from '@seedcord/cli-prompts';

export interface EmojiPrompts {
    confirm: Confirm;
    offer: Confirm;
    pick: (choices: readonly Choice<string>[]) => Promise<string[]>;
    pickGuild: (choices: readonly Choice<string>[]) => Promise<string>;
}

type PromptOutput = Pick<StepPrinter<string>, 'line'>;

// false on a no or a cancel. a no prints `declined` first
export async function approved(
    output: PromptOutput,
    confirm: Confirm,
    question: string,
    declined: string
): Promise<boolean> {
    const yes = await unlessCancelled(output, () => confirm(question));
    if (yes === false) output.line(paint.mute(declined));
    return yes === true;
}

// you get undefined back if the picker was cancelled
export async function picked(
    output: PromptOutput,
    pick: EmojiPrompts['pick'],
    choices: readonly Choice<string>[]
): Promise<string[] | undefined> {
    if (choices.length === 0) return [];
    return unlessCancelled(output, () => pick(choices));
}
