import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { RemoveMode } from '#commands/commands/remove/RemoveMode';
import { commandCount } from '#commands/commands/remove/scope';
import { plural } from '#core/format';

import type { EmptyMessage } from '#commands/commands/remove/RemoveMode';
import type { RemoveOps, RemoveResult, Scan } from '#commands/commands/remove/RemoveRunner';
import type { RemoveWizard, WizardPlan } from '#commands/commands/remove/RemoveWizard';
import type { GuildTargets, ScopedCommands } from '#commands/commands/remove/scope';
import type { Snowflake } from 'discord-api-types/v10';

const PURGE_HINT = 'Run seedcord commands purge to delete every command instead.';

// a guild command with a global command's name shows up twice in discord's picker
export class CleanMode extends RemoveMode {
    public readonly noun = 'duplicate';
    public readonly includesGlobal = false;

    public checkTargets(guilds: GuildTargets): void {
        if (guilds.kind === 'none') throw new SeedcordError(SeedcordErrorCode.CliCleanNoGuilds);
    }

    public select(scan: Scan): ScopedCommands[] {
        const globalNames = new Set(scan.global.map((command) => command.name));
        return scan.guilds
            .map(({ scope, commands }) => ({ scope, commands: commands.filter((c) => globalNames.has(c.name)) }))
            .filter(({ commands }) => commands.length > 0);
    }

    public remove(
        ops: RemoveOps,
        token: string,
        appId: Snowflake,
        selected: readonly ScopedCommands[]
    ): Promise<RemoveResult> {
        return ops.deleteCommands(token, appId, selected);
    }

    protected nothingSelected(scan: Scan): EmptyMessage {
        const guilds = plural(scan.guilds.length, 'guild');
        const scanned = commandCount(scan.guilds);
        if (scanned === 0)
            return { info: [], outro: `Scanned ${guilds} with no guild commands deployed. Nothing to clean.` };
        if (scan.global.length === 0) {
            return {
                info: ['This app has no global commands, so nothing can duplicate one.', PURGE_HINT],
                outro: 'Nothing to clean.'
            };
        }
        return {
            info: [
                `Scanned ${plural(scanned, 'guild command')} across ${guilds}. None duplicate a global command.`,
                PURGE_HINT
            ],
            outro: 'Nothing to clean.'
        };
    }
}

export async function askClean(wizard: RemoveWizard): Promise<WizardPlan | undefined> {
    const guilds = await wizard.askGuilds('Remove guild commands that duplicate a global command. Which guilds?');
    return guilds && { mode: new CleanMode(), guilds };
}
