import { FlagPresenter } from './cleanPresenters';
import { executeClean } from './executeClean';

import type { CleanRunner } from './CleanRunner';
import type { ILogger } from '@seedcord/types';

export interface CleanFlags {
    guildIds: string[];
    allGuilds: boolean;
    apply: boolean;
    purge: boolean;
    yes: boolean;
}

/** Runs `seedcord commands --clean ...` headlessly from parsed flags, reproducing any wizard run. */
export async function runCleanFromFlags(
    runner: CleanRunner,
    flags: CleanFlags,
    token: string,
    logger: ILogger
): Promise<void> {
    await executeClean({
        runner,
        scope: { guildIds: flags.guildIds, allGuilds: flags.allGuilds, purge: flags.purge },
        apply: flags.apply,
        token,
        presenter: new FlagPresenter(logger, flags.yes)
    });
}
