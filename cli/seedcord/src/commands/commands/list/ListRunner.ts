import { GLOBAL_ID } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';

import { LOAD_STEPS, loadCodeScopes } from '#commands/commands/codeScopes';
import { DiscordSession } from '#commands/commands/DiscordSession';
import { defaultRunnerDeps } from '#commands/commands/runnerDeps';

import type { Scan } from '#commands/commands/DiscordSession';
import type { RunnerDeps } from '#commands/commands/runnerDeps';
import type { Steps } from '#core/output/Steps';
import type { ListPresenter } from './ListPresenter';
import type { APIApplicationCommand } from 'discord-api-types/v10';

export const LIST_STEPS = [...LOAD_STEPS, 'read discord'] as const;
export type ListStep = (typeof LIST_STEPS)[number];

// guilds to list on top of the ones the code deploys to
export interface ListScope {
    guildIds: readonly string[];
    allGuilds: boolean;
}

interface GuildListing {
    id: string;
    name: string;
    commands: readonly APIApplicationCommand[];
}

export interface Listing {
    global: APIApplicationCommand[];
    guilds: GuildListing[];
}

const NO_EXTRA_GUILDS: ListScope = { guildIds: [], allGuilds: false };

function listingOf({ global, guilds }: Scan): Listing {
    return {
        global,
        guilds: guilds.map(({ scope: { id, name }, commands }) => ({ id, name, commands }))
    };
}

export class ListRunner {
    constructor(private readonly deps: RunnerDeps) {}

    public static create(): ListRunner {
        return new ListRunner(defaultRunnerDeps());
    }

    public async run(presenter: ListPresenter, scope?: ListScope): Promise<void> {
        presenter.list(await this.read(presenter, scope));
    }

    public async read(steps: Steps<ListStep>, scope = NO_EXTRA_GUILDS): Promise<Listing> {
        const { scopes } = await loadCodeScopes(steps, this.deps, process.cwd());
        const codeGuildIds = [...(scopes?.keys() ?? [])].filter((id) => id !== GLOBAL_ID);

        const { session, scan } = await steps.step('read discord', async () => {
            const session = await DiscordSession.open(this.deps.openDiscord());
            const botGuilds = scope.allGuilds ? await session.guildsOf({ kind: 'all' }) : [];
            const ids = new Set([...codeGuildIds, ...scope.guildIds, ...botGuilds.map(({ id }) => id)]);
            const knownNames = new Map(botGuilds.map(({ id, name }) => [id, name]));
            const guilds = await session.guildsOf({ kind: 'named', ids: [...ids], knownNames });
            return { session, scan: await session.readScopes(guilds) };
        });
        steps.detail('app', paint.mute(session.appId));
        return listingOf(scan);
    }
}
