import { LOAD_STEPS, loadCodeScopes } from '#commands/commands/codeScopes';
import { readDiscordState } from '#commands/commands/discordState';
import { cliLogger } from '#core/cliLogger';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { readBotGuilds } from '#core/discord/readBotGuilds';
import { restFromEnv } from '#core/discord/restFromEnv';
import { openModuleLoader } from '#core/modules/openModuleLoader';

import type { DiscordState } from '#commands/commands/discordState';
import type { ListPresenter, ScopeListing } from './ListPresenter';
import type { REST } from '@discordjs/rest';
import type { ILogger } from '@seedcord/types';

export const LIST_STEPS = [...LOAD_STEPS, 'read discord'] as const;
export type ListStep = (typeof LIST_STEPS)[number];

type ReadRest = Pick<REST, 'get'>;

// guilds to list on top of the ones the code deploys to
export interface ListScope {
    guildIds: readonly string[];
    allGuilds: boolean;
}

const NO_EXTRA_GUILDS: ListScope = { guildIds: [], allGuilds: false };

interface ListRunnerDeps {
    readonly projectLoader: Pick<ProjectLoader, 'open'>;
    readonly openDiscord: () => ReadRest;
    readonly logger: ILogger;
}

export class ListRunner {
    constructor(private readonly deps: ListRunnerDeps) {}

    public static create(): ListRunner {
        return new ListRunner({
            projectLoader: new ProjectLoader(openModuleLoader),
            openDiscord: restFromEnv,
            logger: cliLogger('Commands')
        });
    }

    public async run(presenter: ListPresenter, scope = NO_EXTRA_GUILDS, projectDir = process.cwd()): Promise<void> {
        const { scopes } = await loadCodeScopes(presenter, this.deps, projectDir);
        const codeGuildIds = scopes?.guilds.keys() ?? [];

        const discord = await presenter.step('read discord', async () => {
            const rest = this.deps.openDiscord();
            const botGuilds = scope.allGuilds ? await readBotGuilds(rest) : [];
            const guildIds = new Set([...codeGuildIds, ...scope.guildIds, ...botGuilds.map((guild) => guild.id)]);
            const knownNames = new Map(botGuilds.map((guild) => [guild.id, guild.name]));
            return readDiscordState(rest, [...guildIds], knownNames);
        });
        presenter.detail('app', discord.applicationId);
        presenter.list(listingsOf(discord));
    }
}

// guildNames holds every listed guild, in the order they were asked for
function listingsOf({ deployed, guildNames }: DiscordState<ReadRest>): ScopeListing[] {
    const guilds = guildNames.entries().map(([guildId, title]) => ({
        title,
        commands: [...(deployed.guilds.get(guildId)?.values() ?? [])]
    }));
    return [{ title: 'global', commands: [...deployed.global.values()] }, ...guilds];
}
