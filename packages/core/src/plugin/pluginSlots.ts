import { matchesBotGlobs } from '@seedcord/utils/internal';

import type { Kv } from '#src/kv/Kv';
import type { ResolvedPluginLifecycleSpec } from './lifecycle';
import type { DeclaredScope } from './options';
import type { Logger } from '@seedcord/logger';

// what seedcord keeps on each plugin. the symbols keep it off the members a plugin author writes
export const resolvedSpecSlot = Symbol('seedcord:plugin:spec');
export const loggerSlot = Symbol('seedcord:plugin:logger');
export const scopeSlot = Symbol('seedcord:plugin:scope');
export const commandFilesSlot = Symbol('seedcord:plugin:command-files');

export interface PluginSlots {
    readonly [resolvedSpecSlot]: ResolvedPluginLifecycleSpec;
    readonly [loggerSlot]: Logger;
    readonly [scopeSlot]: DeclaredScope;
    readonly [commandFilesSlot]: string[];
}

interface Attaching {
    readonly key: string;
    readonly kv: Kv;
}

// set only while attach() runs `new Plugin()`
let attaching: Attaching | undefined;

export function constructAttached<TPlugin>(key: string, kv: Kv, construct: () => TPlugin): TPlugin {
    attaching = { key, kv };
    try {
        return construct();
    } finally {
        attaching = undefined;
    }
}

// cleared on read. if a plugin's constructor builds another plugin by hand, that one doesn't get the outer key
export function takeAttaching(): Attaching | undefined {
    const current = attaching;
    attaching = undefined;
    return current;
}

export function resolvedLifecycleSpecOf(plugin: PluginSlots): ResolvedPluginLifecycleSpec {
    return plugin[resolvedSpecSlot];
}

export function pluginLoggerOf(plugin: PluginSlots): Logger {
    return plugin[loggerSlot];
}

export function declaredScopeOf(plugin: PluginSlots): DeclaredScope {
    return plugin[scopeSlot];
}

export function readsCommandFile(plugin: PluginSlots, file: string): boolean {
    return matchesBotGlobs(file, plugin[commandFilesSlot]);
}
