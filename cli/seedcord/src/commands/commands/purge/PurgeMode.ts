import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { RemoveMode } from '#commands/commands/remove/RemoveMode';
import { GLOBAL_SCOPE } from '#commands/commands/scope';

import type { DiscordSession, RemoveResult, Scan } from '#commands/commands/DiscordSession';
import type { EmptyMessage } from '#commands/commands/remove/RemoveMode';
import type { RemoveWizard, WizardPlan } from '#commands/commands/remove/RemoveWizard';
import type { GuildTargets, ScopedCommands } from '#commands/commands/scope';
import type { Prompter } from '#core/prompts/Prompter';

export class PurgeMode extends RemoveMode {
    public readonly itemName = 'command';

    constructor(public readonly includesGlobal: boolean) {
        super();
    }

    public assertTargets(guilds: GuildTargets): void {
        if (!this.includesGlobal && guilds.kind === 'none')
            throw new SeedcordError(SeedcordErrorCode.CliPurgeNoTargets);
    }

    public select(scan: Scan): ScopedCommands[] {
        const scopes: ScopedCommands[] = this.includesGlobal
            ? [{ scope: GLOBAL_SCOPE, commands: scan.global }, ...scan.guilds]
            : scan.guilds;
        return scopes.filter(({ commands }) => commands.length > 0);
    }

    public remove(session: DiscordSession, selected: readonly ScopedCommands[]): Promise<RemoveResult> {
        return session.clearScopes(selected);
    }

    public nothingToRemove(): EmptyMessage {
        return { info: [], outro: 'No commands to delete.' };
    }
}

type PurgeWhere = 'guilds' | 'global' | 'both';

export async function askPurge(wizard: RemoveWizard, prompter: Prompter): Promise<WizardPlan | undefined> {
    const where = await prompter.select<PurgeWhere>({
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
