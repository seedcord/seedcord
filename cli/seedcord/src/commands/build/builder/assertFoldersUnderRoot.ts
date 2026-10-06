import { isAbsolute, relative, resolve, sep } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { BotConfig, Config } from '@seedcord/types';

interface FolderSection {
    path: string | null;
    middlewares?: string | undefined;
}

// only the gateway config has events
function hasEvents(bot: BotConfig): bot is BotConfig & { events: FolderSection } {
    return 'events' in bot;
}

function configuredFolders({ bot, subscribers }: Config): string[] {
    const sections: FolderSection[] = [bot.interactions, bot.commands, subscribers];
    if (hasEvents(bot)) sections.push(bot.events);

    return sections.flatMap(({ path, middlewares }) => [path, middlewares].filter((dir) => typeof dir === 'string'));
}

// plugin folders get only the runtime check in @seedcord/utils
export function assertFoldersUnderRoot(config: Config, root: string): void {
    for (const folder of configuredFolders(config)) {
        // the bot resolves a relative folder against cwd
        const dir = resolve(process.cwd(), folder);
        const fromRoot = relative(root, dir);
        if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
            throw new SeedcordError(SeedcordErrorCode.CoreDirectoryOutsideRoot, [dir, root]);
        }
    }
}
