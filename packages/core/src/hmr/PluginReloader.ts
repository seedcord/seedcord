import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { formatFilePath } from '@seedcord/utils';
import { vitePluginThrew } from '@seedcord/utils/internal';

import { importFile, importSaved } from './importFile';

import type { PluginCtor } from '#src/plugin/Plugin';
import type { Attachment } from '#src/plugin/PluginRegistry';
import type { HmrAware } from '@seedcord/types';

export interface ReloadablePlugins {
    readonly attachments: () => readonly Attachment[];
    readonly replace: (old: Attachment, Plugin: PluginCtor) => Promise<Attachment>;
    readonly listeners: { register(listener: HmrAware): void; unregister(listener: HmrAware): void };
}

// replaces an attached plugin with its new class when you save the plugin's file
export class PluginReloader {
    private readonly logger = new Logger('Plugins', { channel: 'hmr' });
    // file, then export name, then the attachments that were built from that export
    private readonly sources = new Map<string, Map<string, Attachment[]>>();

    constructor(private readonly plugins: ReloadablePlugins) {}

    // files are the ones that the bot file imports. this has to run before any of them is saved
    // because importing a saved one returns a new class, which no attachment was built from
    public async learn(files: readonly string[]): Promise<void> {
        this.sources.clear();
        const attachments = this.plugins.attachments();

        for (const file of files) {
            const builtFrom = new Map<string, Attachment[]>();
            for (const [name, value] of Object.entries(await importFile(file))) {
                const built = attachments.filter(({ instance }) => instance.constructor === value);
                if (built.length > 0) builtFrom.set(name, built);
            }
            if (builtFrom.size > 0) this.sources.set(file, builtFrom);
        }
    }

    // the bot file imports each of these files, and you saved each one or something it imports.
    // false means the bot needs a restart
    public async reload(files: readonly string[]): Promise<boolean> {
        // one of the files doesn't export a plugin. the bot file read something else from it and still holds the old value
        if (!files.every((file) => this.sources.has(file))) return false;

        // a plugin that the bot file imports through a barrel is in two of the files
        const replaced = new Map<Attachment, Attachment>();
        for (const file of files) {
            if (!(await this.reloadFile(file, replaced))) return false;
        }
        return true;
    }

    private async reloadFile(file: string, replaced: Map<Attachment, Attachment>): Promise<boolean> {
        const path = paint.mute(formatFilePath(file));
        let exported: Record<string, unknown>;
        try {
            exported = await importSaved(file);
        } catch (error) {
            // nothing was disposed, and the old plugins keep running until you save the file again
            this.logger.error(`Failed to reload file: ${path}`, vitePluginThrew(error) ?? error);
            return true;
        }

        const startedAt = Date.now();
        const reloaded: string[] = [];
        for (const [name, attachments] of this.sources.get(file) ?? []) {
            const Plugin = exported[name];
            if (typeof Plugin !== 'function') {
                this.logger.warn(`${path} doesn't export ${paint.sky.bold(name)} now`);
                return false;
            }

            for (const [index, old] of attachments.entries()) {
                let next = replaced.get(old);
                if (!next) {
                    // justified: replace() throws for a class that doesn't extend Plugin
                    next = await this.replace(old, Plugin as PluginCtor);
                    if (!next) return false;
                    replaced.set(old, next);
                    reloaded.push(`${Plugin.name} at ${next.key}`);
                }
                attachments[index] = next;
            }
        }

        if (reloaded.length > 0) {
            const timing = `${paint.mute('in')} ${String(Date.now() - startedAt)}ms`;
            this.logger.debug(`Reloaded ${paint.sky.bold(reloaded.join(', '))} from ${path} ${timing}`);
        }
        return true;
    }

    private async replace(old: Attachment, Plugin: PluginCtor): Promise<Attachment | undefined> {
        const { listeners } = this.plugins;
        listeners.unregister(old.instance);
        try {
            const next = await this.plugins.replace(old, Plugin);
            listeners.register(next.instance);
            return next;
        } catch (error) {
            this.logger.error(`Failed to reload ${paint.sky.bold(Plugin.name)} at ${paint.sky.bold(old.key)}`, error);
            return undefined;
        }
    }
}
