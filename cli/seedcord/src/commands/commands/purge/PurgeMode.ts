import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { RemoveMode } from '#commands/commands/remove/RemoveMode';
import { GLOBAL_SCOPE } from '#commands/commands/remove/scope';

import type { EmptyMessage } from '#commands/commands/remove/RemoveMode';
import type { RemoveOps, RemoveResult, Scan } from '#commands/commands/remove/RemoveRunner';
import type { RemoveWizard, WizardPlan } from '#commands/commands/remove/RemoveWizard';
import type { GuildTargets, ScopedCommands } from '#commands/commands/remove/scope';
import type { Snowflake } from 'discord-api-types/v10';

export class PurgeMode extends RemoveMode {
    public readonly noun = 'command';

    constructor(public readonly includesGlobal: boolean) {
        super();
    }

    public checkTargets(guilds: GuildTargets): void {
        if (!this.includesGlobal && guilds.kind === 'none')
            throw new SeedcordError(SeedcordErrorCode.CliPurgeNoTargets);
    }

    public select(scan: Scan): ScopedCommands[] {
        const scopes = this.includesGlobal
            ? [{ scope: GLOBAL_SCOPE, commands: scan.global }, ...scan.guilds]
            : scan.guilds;
        return scopes.filter(({ commands }) => commands.length > 0);
    }

    // one PUT empties a whole scope
    public remove(
        ops: RemoveOps,
        token: string,
        appId: Snowflake,
        selected: readonly ScopedCommands[]
    ): Promise<RemoveResult> {
        return ops.clearScopes(token, appId, selected);
    }

    protected nothingSelected(): EmptyMessage {
        return { info: [], outro: 'No commands to delete.' };
    }
}

type PurgeWhere = 'guilds' | 'global' | 'both';

export async function askPurge(wizard: RemoveWizard): Promise<WizardPlan | undefined> {
    const where = await wizard.prompter.select<PurgeWhere>({
        message: 'Delete every command where?',
        choices: [
            { value: 'guilds', label: 'In guilds' },
            { value: 'global', label: 'Globally' },
            { value: 'both', label: 'Globally and in guilds' }
        ]
    });
    if (where === 'global') return { mode: new PurgeMode(true), guilds: { kind: 'none' } };

    const guilds = await wizard.askGuilds('Which guilds?');
    return guilds && { mode: new PurgeMode(where === 'both'), guilds };
}
