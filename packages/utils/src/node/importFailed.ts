import * as path from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { asError } from '#src/misc/asError';
import { isPlainObject } from '#src/objects/isPlainObject';

interface ThrownBy {
    plugin: string;
    hook: string;
    configFile: string;
    // the module id, for a hook that runs on a module
    id?: string | undefined;
}

// rolldown and the edge worker's JSON copy both keep an error's own string-keyed fields
const THROWN_BY_KEY = 'seedcord:utils:thrown-by';

export function recordThrownBy(caught: unknown, thrownBy: ThrownBy): Error {
    const error = asError(caught);
    // Reflect.set leaves a frozen error as it was
    Reflect.set(error, THROWN_BY_KEY, thrownBy);
    return error;
}

function thrownByOf(error: unknown): ThrownBy | undefined {
    if (!Error.isError(error)) return undefined;
    const thrownBy: unknown = Reflect.get(error, THROWN_BY_KEY);
    if (!isPlainObject(thrownBy)) return undefined;
    const { plugin, hook, configFile, id } = thrownBy;
    if (typeof plugin !== 'string' || typeof hook !== 'string' || typeof configFile !== 'string') return undefined;
    return { plugin, hook, configFile, id: typeof id === 'string' ? id : undefined };
}

// a vite id can end in a query. a virtual one starts with \0
function shownId(id: string): string {
    if (id.startsWith('\0')) return id.slice(1);
    return path.relative(process.cwd(), id.split('?')[0] ?? id);
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
        const place = { hook: thrownBy.hook, file: thrownBy.id === undefined ? undefined : shownId(thrownBy.id) };
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
