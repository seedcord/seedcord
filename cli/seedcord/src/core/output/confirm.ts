import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { isInteractive } from '@seedcord/utils/internal';

import type { Prompter } from '@seedcord/cli-prompts';

export type Confirm = (message: string) => Promise<boolean>;

export const PROCEED: Confirm = () => Promise.resolve(true);

interface AsksFirst {
    yes: boolean;
    command: string;
    // "deploys", "uploads". the error reads "asks before it deploys"
    action: string;
}

export function confirmOrYes(prompter: Prompter, { yes, command, action }: AsksFirst): Confirm {
    if (yes) return PROCEED;
    if (!isInteractive()) throw new SeedcordTypeError(SeedcordErrorCode.CliNeedsYes, [command, action]);
    return (message) => prompter.confirm({ message });
}
