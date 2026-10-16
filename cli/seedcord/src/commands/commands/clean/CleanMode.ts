import { commandKey } from '@seedcord/core/internal';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { RemoveMode } from '#commands/commands/remove/RemoveMode';
import { commandCount } from '#commands/commands/scope';
import { plural } from '#core/format';

import type { DiscordSession, RemoveResult, Scan } from '#commands/commands/DiscordSession';
import type { EmptyMessage } from '#commands/commands/remove/RemoveMode';
import type { RemoveWizard, WizardPlan } from '#commands/commands/remove/RemoveWizard';
import type { GuildTargets, ScopedCommands } from '#commands/commands/scope';

const PURGE_HINT = `Run ${paint.bold('seedcord commands purge')} to delete every command instead.`;

// a guild command with a global command's name and type shows up twice in discord's picker
export class CleanMode extends RemoveMode {
    public readonly itemName = 'duplicate';
    public readonly includesGlobal = false;

    public assertTargets(guilds: GuildTargets): void {
        if (guilds.kind === 'none') {
            throw new SeedcordTypeError(SeedcordErrorCode.CliNoScopeGiven, [
                ['--guilds <ids...>', '--all-guilds'],
                'Clean never touches global commands.'
            ]);
        }
    }

    public select(scan: Scan): ScopedCommands[] {
        const globalKeys = new Set(scan.global.map(commandKey));
        return scan.guilds
            .map(({ scope, commands }) => ({ scope, commands: commands.filter((c) => globalKeys.has(commandKey(c))) }))
            .filter(({ commands }) => commands.length > 0);
    }

    public remove(session: DiscordSession, selected: readonly ScopedCommands[]): Promise<RemoveResult> {
        return session.deleteCommands(selected);
    }

    public nothingToRemove(scan: Scan): EmptyMessage {
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
    const guilds = await wizard.askGuilds('Delete guild commands that duplicate a global command. Which guilds?');
    return guilds && { mode: new CleanMode(), guilds };
}
