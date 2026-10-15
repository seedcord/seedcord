import { LOAD_STEPS, loadCodeScopes } from '#commands/commands/codeScopes';
import { readDiscordState } from '#commands/commands/discordState';
import { cliLogger } from '#core/cliLogger';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { restFromEnv } from '#core/discord/restFromEnv';
import { openModuleLoader } from '#core/modules/openModuleLoader';

import type { DiscordState } from '#commands/commands/discordState';
import type { ListPresenter, ScopeListing } from './ListPresenter';
import type { REST } from '@discordjs/rest';
import type { ILogger } from '@seedcord/types';

export const LIST_STEPS = [...LOAD_STEPS, 'read discord'] as const;
export type ListStep = (typeof LIST_STEPS)[number];

type ReadRest = Pick<REST, 'get'>;

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

    public async run(presenter: ListPresenter, projectDir = process.cwd()): Promise<void> {
        const { scopes } = await loadCodeScopes(presenter, this.deps, projectDir);
        const guildIds = [...(scopes?.guilds.keys() ?? [])];

        const discord = await presenter.step('read discord', () => readDiscordState(this.deps.openDiscord(), guildIds));
        presenter.detail('app', discord.applicationId);
        presenter.list(listingsOf(guildIds, discord));
    }
}

function listingsOf(guildIds: readonly string[], { deployed, guildNames }: DiscordState<ReadRest>): ScopeListing[] {
    const guilds = guildIds.map((guildId) => ({
        title: guildNames.get(guildId) ?? guildId,
        commands: [...(deployed.guilds.get(guildId)?.values() ?? [])]
    }));
    return [{ title: 'global', commands: [...deployed.global.values()] }, ...guilds];
}
