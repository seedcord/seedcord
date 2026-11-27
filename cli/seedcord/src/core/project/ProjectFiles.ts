import { basename, dirname, relative } from 'node:path';

import { logsFolderIn } from '@seedcord/logger/internal';
import { BotLayout, folderEmojisIn } from '@seedcord/utils/internal';

import { ClientPages } from '#core/modules/ClientPages';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { BotEntry, FolderEmoji } from '@seedcord/utils/internal';

type ProjectPaths = Pick<ResolvedSeedcordConfig, 'root' | 'configFile' | 'files' | 'target' | 'emojis' | 'client'>;

// the build writes these into the entry because a built bot can't read them from disk
export interface BuiltLists {
    folders: string[];
    emojis: FolderEmoji[];
}

function layoutOf({ root, configFile, files, target, emojis, client }: ProjectPaths): BotLayout {
    const configDir = dirname(configFile);
    const keysOf = (paths: string[]): string[] => paths.map((path) => BotLayout.keyUnder(root, path));
    const outDir = target.kind === 'server' ? [target.outDir] : [];

    return new BotLayout({
        root,
        listed: keysOf(files),
        // the bot never loads a module from client.dir because it holds the pages for the browser
        skippedFolders: keysOf([...outDir, logsFolderIn(configDir), client.dir]),
        configFile: BotLayout.keyUnder(root, configFile),
        emojiFolder: BotLayout.keyUnder(root, emojis.dir)
    });
}

export class ProjectFiles {
    public readonly layout: BotLayout;
    public readonly client: ClientPages;

    constructor(private readonly paths: ProjectPaths) {
        this.client = new ClientPages(paths);
        this.layout = layoutOf(paths);
    }

    public async modulePaths(folder = this.layout.root): Promise<string[]> {
        this.layout.assertBundled(folder);
        return this.layout.modulesUnder(folder);
    }

    public async builtLists(): Promise<BuiltLists> {
        const [entries, emojis] = await Promise.all([this.entries(), folderEmojisIn(this.paths.emojis.dir)]);
        const folders = entries.flatMap(({ isFolder, path }) => (isFolder ? [this.layout.keyOf(path)] : [])).toSorted();
        return { folders, emojis };
    }

    public async pathsWithHash(): Promise<string[]> {
        const entries = await this.entries();
        return entries
            .flatMap(({ path }) =>
                basename(path).includes('#') && !relative(this.layout.root, dirname(path)).includes('#') ? [path] : []
            )
            .toSorted();
    }

    private async entries(): Promise<BotEntry[]> {
        const besideRoot = this.layout
            .listedBesideRoot()
            .map(async (folder) => [
                { path: folder, isFolder: true },
                ...(await Array.fromAsync(this.layout.entriesUnder(folder)))
            ]);
        const all = await Promise.all([Array.fromAsync(this.layout.entriesUnder(this.layout.root)), ...besideRoot]);
        return all.flat();
    }
}
