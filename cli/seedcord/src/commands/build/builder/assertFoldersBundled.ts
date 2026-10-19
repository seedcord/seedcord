import { SeedcordErrorCode } from '@seedcord/errors';
import { throwSingleOrAggregate } from '@seedcord/errors/internal';

import type { Project } from '#core/project/Project';
import type { EventsConfig } from '@seedcord/gateway';
import type { BotConfig, CommandsConfig, Config, InteractionsConfig, SubscribersConfig } from '@seedcord/types';

type FolderSection = InteractionsConfig | CommandsConfig | SubscribersConfig | EventsConfig;

function hasEvents(bot: BotConfig): bot is BotConfig & { events: EventsConfig } {
    return 'events' in bot;
}

function configuredFolders({ bot, subscribers }: Config): string[] {
    const sections: FolderSection[] = [bot.interactions, bot.commands, subscribers];
    if (hasEvents(bot)) sections.push(bot.events);

    return sections.flatMap((section) => {
        const middlewares = 'middlewares' in section ? section.middlewares : undefined;
        return [section.path, middlewares].filter((folder) => typeof folder === 'string');
    });
}

// plugin folders get only the runtime check in @seedcord/utils
export function assertFoldersBundled(config: Config, { files: { layout } }: Project): void {
    const problems = configuredFolders(config).map((folder) => layout.bundleProblem(layout.resolve(folder)));
    throwSingleOrAggregate(
        problems.filter((problem) => problem !== undefined),
        SeedcordErrorCode.CliProblems
    );
}
