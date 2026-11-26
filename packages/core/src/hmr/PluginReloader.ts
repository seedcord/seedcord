import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { formatFilePath } from '@seedcord/utils';
import { vitePluginThrew } from '@seedcord/utils/internal';

import { extendsThisCorePlugin } from '#src/plugin/Plugin';

import { importFile, importSaved } from './importFile';

import type { PluginLifecycle } from '#src/lifecycle/PluginLifecycle';
import type { PluginCtor } from '#src/plugin/Plugin';
import type { Attachment, Replacement } from '#src/plugin/PluginRegistry';
import type { HmrManager } from './HmrManager';
import type { BotImport } from '@seedcord/types/internal';

export type ReloadablePlugins = Pick<PluginLifecycle, 'attachments' | 'rebuild' | 'replace'>;

type ExportName = string;
type AttachKey = string;
type BuiltFrom = Map<ExportName, AttachKey[]>;

export class PluginReloader {
    private readonly logger = new Logger('Plugins', { channel: 'hmr' });
    private readonly sources = new Map<string, BuiltFrom>();

    constructor(
        private readonly plugins: ReloadablePlugins,
        private readonly hmr: HmrManager
    ) {}

    // run this before you save any of these files because it matches attachments by class and a saved file exports a new one
    public async learn(imports: readonly BotImport[]): Promise<void> {
        this.sources.clear();
        const { attachments } = this.plugins;

        for (const { file, names } of imports) {
            const exported = await importFile(file);
            const builtFrom: BuiltFrom = new Map();
            for (const [name, value] of Object.entries(exported)) {
                const built = attachments.filter(({ instance }) => instance.constructor === value);
                if (built.length > 0)
                    builtFrom.set(
                        name,
                        built.map(({ key }) => key)
                    );
            }
            // the bot file keeps the old value of anything else it reads, like an exported PORT
            const reads = names === 'all' ? Object.keys(exported) : names;
            if (builtFrom.size > 0 && reads.every((name) => builtFrom.has(name))) this.sources.set(file, builtFrom);
        }
    }

    public async reloadedWithoutRestart(files: readonly string[]): Promise<boolean> {
        const sources: [string, BuiltFrom][] = [];
        for (const file of files) {
            const builtFrom = this.sources.get(file);
            if (!builtFrom) return false;
            sources.push([file, builtFrom]);
        }

        const notReplaced = new Map(this.plugins.attachments.map((attachment) => [attachment.key, attachment]));
        const resume = await this.hmr.pauseGates();
        try {
            for (const [file, builtFrom] of sources) {
                if (!(await this.reloadFile(file, builtFrom, notReplaced))) return false;
            }
            return true;
        } finally {
            resume();
        }
    }

    private async reloadFile(
        file: string,
        builtFrom: BuiltFrom,
        notReplaced: Map<AttachKey, Attachment>
    ): Promise<boolean> {
        const path = paint.mute(formatFilePath(file));
        let exported: Record<string, unknown>;
        try {
            exported = await importSaved(file);
        } catch (error) {
            // the old plugins keep running because nothing was disposed yet
            this.logger.error(`Failed to reload file: ${path}`, vitePluginThrew(error) ?? error);
            return true;
        }

        const startedAt = Date.now();
        const reloaded: string[] = [];
        for (const [name, keys] of builtFrom) {
            const Plugin = exported[name];
            if (!extendsThisCorePlugin(Plugin)) {
                this.logger.warn(`${path} doesn't export a plugin called ${paint.sky.bold(name)} now`);
                return false;
            }

            for (const key of keys) {
                const old = notReplaced.get(key);
                // another of the bot's imports, like a barrel, already replaced it
                if (!old) continue;
                notReplaced.delete(key);
                const replacement = this.rebuilt(old, Plugin);
                // the old plugin keeps running, like it does when the file throws while it imports
                if (!replacement) continue;
                if (!(await this.replace(replacement))) return false;
                reloaded.push(`${Plugin.name} at ${key}`);
            }
        }

        if (reloaded.length > 0) {
            const timing = `${paint.mute('in')} ${String(Date.now() - startedAt)}ms`;
            this.logger.debug(`Reloaded ${paint.sky.bold(reloaded.join(', '))} from ${path} ${timing}`);
        }
        return true;
    }

    private rebuilt(old: Attachment, Plugin: PluginCtor): Replacement | undefined {
        try {
            return this.plugins.rebuild(old, Plugin);
        } catch (error) {
            this.logger.error(`Failed to build ${paint.sky.bold(Plugin.name)} at ${paint.sky.bold(old.key)}`, error);
            return undefined;
        }
    }

    private async replace(replacement: Replacement): Promise<boolean> {
        try {
            await this.plugins.replace(replacement, this.hmr);
            return true;
        } catch (error) {
            this.logger.error(`Failed to reload ${paint.sky.bold(replacement.next.key)}`, error);
            // every file you save from here needs a restart because the old plugin may be disposed and the new one never started
            this.sources.clear();
            return false;
        }
    }
}
