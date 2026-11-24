import { watch } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { isInside } from '@seedcord/utils/internal';

import { viteEnvFiles } from '#core/modules/viteEnvFiles';

import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { BotLayout } from '@seedcord/utils/internal';
import type { FSWatcher } from 'node:fs';

const logger = new Logger('HMR', { channel: 'hmr' });

type RestartConfig = Pick<ResolvedSeedcordConfig, 'root' | 'configFile' | 'instance' | 'viteMode' | 'hmr' | 'emojis'>;

// every file whose save triggers a dev restart
export class RestartFiles {
    private readonly configDir: string;
    private readonly hiddenNames: Set<string>;
    // hmr.restart and each registerCriticalFiles call get a group because a ! pattern only excludes from its own group
    private readonly patternGroups: (readonly string[])[] = [];

    // targetFiles are the edge target's cloudflare.config.ts and .dev.vars files
    public constructor(
        private readonly config: RestartConfig,
        private readonly layout: BotLayout,
        targetFiles: readonly string[]
    ) {
        this.configDir = dirname(config.configFile);
        this.hiddenNames = new Set([basename(config.configFile), ...viteEnvFiles(config.viteMode), ...targetFiles]);
        this.addPatterns(config.hmr?.restart ?? []);
    }

    // vite restarts itself when its watcher reports an env file. the cloudflare plugin does the same for its config.
    // either restart leaves the bot's module runner on the closed server
    public readonly hiddenFromVite = (path: string): boolean => {
        // chokidar passes forward slashes to vite's ignored matchers on windows
        const file = resolve(path);
        return dirname(file) === this.configDir && this.hiddenNames.has(basename(file));
    };

    public isBotFile(file: string): boolean {
        return file === this.config.instance;
    }

    // saving a file that the bot file imports may need one as well. HmrPlugin sends the update to the bot to find out
    public needsRestart(file: string): boolean {
        if (this.hiddenFromVite(file) || this.layout.isProjectFile(file)) return true;
        // the bot only reads the emojis folder at startup
        if (isInside(this.config.emojis.dir, file)) return true;
        return this.patternGroups.some((patterns) => this.layout.matchesFiles(file, patterns));
    }

    public addPatterns(patterns: readonly string[]): void {
        this.patternGroups.push(patterns);
    }

    // fs.watch on a file stops once an atomic save replaces it
    public watch(onChange: (file: string) => void): FSWatcher {
        const watcher = watch(this.configDir, (_event, name) => {
            const file = name === null ? undefined : join(this.configDir, name);
            if (file !== undefined && this.hiddenFromVite(file)) onChange(file);
        });
        // node throws process-wide without a listener here
        watcher.on('error', (error) => {
            logger.warn(
                `Stopped watching ${paint.path(this.configDir)} for changes that need a restart: ${error.message}`
            );
        });
        return watcher;
    }
}
