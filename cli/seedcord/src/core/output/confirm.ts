import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { isInteractive } from '@seedcord/utils/internal';

import type { Prompter } from '@seedcord/cli-prompts';

export type Confirm = (message: string) => Promise<boolean>;

export const PROCEED: Confirm = () => Promise.resolve(true);
const DECLINE: Confirm = () => Promise.resolve(false);

interface AsksFirst {
    yes: boolean;
    command: string;
    // like "deploys" or "uploads". the error says "asks before it deploys"
    action: string;
}

// use this when the command can't continue without an answer
export function confirmOrYes(prompter: Prompter, { yes, command, action }: AsksFirst): Confirm {
    if (yes) return PROCEED;
    if (!isInteractive()) throw new SeedcordTypeError(SeedcordErrorCode.CliNeedsYes, [command, action]);
    return (message) => prompter.confirm({ message });
}

// use this for an optional extra that also has a flag. it's a "no" when it can't ask, and with --yes
export function offerOrNo(prompter: Prompter, yes: boolean): Confirm {
    return !yes && isInteractive() ? (message) => prompter.confirm({ message }) : DECLINE;
}
