import { paint } from '@seedcord/errors';
import { pluralize, unlessAborted } from '@seedcord/utils/internal';

import { getDevChannel } from '#hmr/devChannel';
import { guildSummaries } from '#src/commands/guildSummaries';
import { GLOBAL_ID, skippedNote } from '#src/commands/scopes';

import type { CommandBody } from '#src/commands/putCommands';
import type { ScopeId } from '#src/commands/scopes';
import type { REST } from '@discordjs/rest';
import type { Logger } from '@seedcord/logger';

export class DeployReporter {
    private readonly guildNames = new Map<string, string>();

    constructor(private readonly logger: Logger) {}

    // only seedcord dev reads guild names
    public async readGuildNames(
        rest: Pick<REST, 'get'>,
        scopes: readonly ScopeId[],
        signal: AbortSignal | undefined
    ): Promise<void> {
        if (!getDevChannel()) return;
        const unread = scopes.filter((scope) => scope !== GLOBAL_ID && !this.guildNames.has(scope));
        for (const { id, name } of await unlessAborted(guildSummaries(rest, unread), signal)) {
            this.guildNames.set(id, name);
        }
    }

    public skipped(scopes: readonly ScopeId[]): void {
        if (scopes.length > 0) this.logger.info(skippedNote(scopes, (guildId) => this.guildLabel(guildId)));
    }

    public deployed(scope: ScopeId, commands: readonly CommandBody[]): void {
        const { utils } = this.logger;
        const count = paint.iris.bold(commands.length);
        const tag = pluralize(commands.length, 'command');
        const title =
            scope === GLOBAL_ID
                ? `Deployed ${count} global ${tag}`
                : `Deployed ${count} ${tag} to ${this.guildLabel(scope)}`;

        utils.block(title, utils.wrap(commands.map((command) => command.name)), 'info');
    }

    private guildLabel(guildId: string): string {
        return paint.sky.bold(this.guildNames.get(guildId) ?? guildId);
    }
}
