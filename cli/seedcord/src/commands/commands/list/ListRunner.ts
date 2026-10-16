import { LOAD_STEPS, loadCodeScopes } from '#commands/commands/codeScopes';
import { readDiscordState } from '#commands/commands/discordState';
import { cliLogger } from '#core/cliLogger';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { readBotGuilds } from '#core/discord/readBotGuilds';
import { restFromEnv } from '#core/discord/restFromEnv';
import { openModuleLoader } from '#core/modules/openModuleLoader';

import type { DiscordState } from '#commands/commands/discordState';
import type { Steps } from '#core/output/Steps';
import type { REST } from '@discordjs/rest';
import type { ILogger } from '@seedcord/types';
import type { APIApplicationCommand } from 'discord-api-types/v10';

export const LIST_STEPS = [...LOAD_STEPS, 'read discord'] as const;
export type ListStep = (typeof LIST_STEPS)[number];

type ReadRest = Pick<REST, 'get'>;

// guilds to list on top of the ones the code deploys to
export interface ListScope {
    guildIds: readonly string[];
    allGuilds: boolean;
}

export interface GuildListing {
    id: string;
    name: string;
    commands: APIApplicationCommand[];
}

export interface Listing {
    global: APIApplicationCommand[];
    guilds: GuildListing[];
}

interface ListRunnerDeps {
    readonly projectLoader: Pick<ProjectLoader, 'open'>;
    readonly openDiscord: () => ReadRest;
    readonly logger: ILogger;
}

const NO_EXTRA_GUILDS: ListScope = { guildIds: [], allGuilds: false };

export class ListRunner {
    constructor(private readonly deps: ListRunnerDeps) {}

    public static create(): ListRunner {
        return new ListRunner({
            projectLoader: new ProjectLoader(openModuleLoader),
            openDiscord: restFromEnv,
            logger: cliLogger('Commands')
        });
    }

    public async read(steps: Steps<ListStep>, scope = NO_EXTRA_GUILDS, projectDir = process.cwd()): Promise<Listing> {
        const { scopes } = await loadCodeScopes(steps, this.deps, projectDir);
        const codeGuildIds = scopes?.guilds.keys() ?? [];

        const discord = await steps.step('read discord', async () => {
            const rest = this.deps.openDiscord();
            const botGuilds = scope.allGuilds ? await readBotGuilds(rest) : [];
            const guildIds = new Set([...codeGuildIds, ...scope.guildIds, ...botGuilds.map((guild) => guild.id)]);
            const knownNames = new Map(botGuilds.map((guild) => [guild.id, guild.name]));
            return readDiscordState(rest, [...guildIds], knownNames);
        });
        steps.detail('app', discord.applicationId);
        return listingOf(discord);
    }
}

// guildNames holds every listed guild, in the order they were asked for
function listingOf({ deployed, guildNames }: DiscordState<ReadRest>): Listing {
    const guilds = guildNames.entries().map(([id, name]) => ({
        id,
        name,
        commands: [...(deployed.guilds.get(id)?.values() ?? [])]
    }));
    return { global: [...deployed.global.values()], guilds: [...guilds] };
}
