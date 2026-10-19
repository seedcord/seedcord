import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { asError } from '#src/misc/asError';
import { isPlainObject } from '#src/objects/isPlainObject';

import { withoutQuery } from './withoutQuery';

import type { VitePluginPlace } from '@seedcord/errors/internal';

interface ThrownBy {
    plugin: string;
    hook: string;
    configFile: string;
    moduleId?: string | undefined;
}

type LoadedModule = NonNullable<VitePluginPlace['loading']>;

// rolldown and the edge worker's JSON copy both keep an error's own string-keyed fields
const THROWN_BY_KEY = 'seedcord:utils:thrown-by';

export function recordThrownBy(caught: unknown, thrownBy: ThrownBy): Error {
    const error = asError(caught);
    // a hook that calls into another plugin passes that plugin's error up through its own wrapper
    if (thrownByOf(error) !== undefined) return error;
    // Reflect.set leaves a frozen error as it was
    Reflect.set(error, THROWN_BY_KEY, thrownBy);
    return error;
}

function thrownByOf(error: unknown): ThrownBy | undefined {
    if (!Error.isError(error)) return undefined;
    const thrownBy: unknown = Reflect.get(error, THROWN_BY_KEY);
    if (!isPlainObject(thrownBy)) return undefined;
    const { plugin, hook, configFile, moduleId } = thrownBy;
    if (typeof plugin !== 'string' || typeof hook !== 'string' || typeof configFile !== 'string') return undefined;
    return { plugin, hook, configFile, moduleId: typeof moduleId === 'string' ? moduleId : undefined };
}

// vite starts a virtual module's id with \0 and can add a query to a file's
function loadedModule(moduleId: string): LoadedModule {
    if (moduleId.startsWith('\0')) return { kind: 'virtual', id: moduleId.slice(1) };
    return { kind: 'file', path: withoutQuery(moduleId) };
}

// rolldown's build error lists one error per failed hook
function errorsIn(error: unknown): unknown[] {
    const collected: unknown = Error.isError(error) ? Reflect.get(error, 'errors') : undefined;
    const errors: readonly unknown[] = Array.isArray(collected) ? collected : [];
    return [error, ...errors];
}

export function vitePluginThrew(error: unknown): SeedcordError | undefined {
    for (const candidate of errorsIn(error)) {
        const thrownBy = thrownByOf(candidate);
        if (!thrownBy) continue;
        const { moduleId } = thrownBy;
        const place = { hook: thrownBy.hook, loading: moduleId === undefined ? undefined : loadedModule(moduleId) };
        return new SeedcordError(
            SeedcordErrorCode.CoreVitePluginThrew,
            [thrownBy.plugin, place, thrownBy.configFile, asError(candidate).message],
            { cause: candidate }
        );
    }
    return undefined;
}

export function importFailed(file: string, error: unknown): SeedcordError {
    return (
        vitePluginThrew(error) ??
        new SeedcordError(SeedcordErrorCode.CoreImportFailed, [file, asError(error).message], { cause: error })
    );
}
