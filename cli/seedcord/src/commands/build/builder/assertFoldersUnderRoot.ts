import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, throwSingleOrAggregate } from '@seedcord/errors/internal';
import { isInside } from '@seedcord/utils/node/internal';

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

function* folderProblems(config: Config, project: Project): Generator<SeedcordError> {
    const { root } = project.config;
    for (const folder of configuredFolders(config)) {
        const resolved = project.fromRoot(folder);
        if (!isInside(root, resolved)) {
            yield new SeedcordError(SeedcordErrorCode.CoreDirectoryOutsideRoot, [resolved, root]);
        }
    }
}

// plugin folders get only the runtime check in @seedcord/utils
export function assertFoldersUnderRoot(config: Config, project: Project): void {
    throwSingleOrAggregate([...folderProblems(config, project)], SeedcordErrorCode.CliProblems);
}
