import { isPlainObject, isStringArray } from '@seedcord/utils/internal';

import { FILTER_LEVELS } from '#ui/components/primitives/FilterChips';
import { isDetailMode } from '#ui/LogLayout';

import type { StateFile } from '#core/state/StateFolder';
import type { DetailMode } from '#ui/LogLayout';
import type { LogLevel } from '@seedcord/types';

export interface LogFilters {
    readonly channels: ReadonlySet<string>;
    readonly levels: ReadonlySet<LogLevel>;
}

export interface DevPrefs {
    readonly filters: LogFilters;
    readonly details: DetailMode;
    readonly railHidden: boolean;
}

const LEVEL_NAMES: ReadonlySet<string> = new Set(FILTER_LEVELS);

function isFilterLevels(values: readonly string[]): values is LogLevel[] {
    return values.every((value) => LEVEL_NAMES.has(value));
}

export const devPrefsFile: StateFile<DevPrefs> = {
    name: 'dev-prefs.json',
    defaults: { filters: { channels: new Set(), levels: new Set() }, details: 'auto', railHidden: false },
    parse(raw) {
        if (!isPlainObject(raw) || !isPlainObject(raw.filters)) return undefined;
        const { channels, levels } = raw.filters;
        if (!isStringArray(channels) || !isStringArray(levels) || !isFilterLevels(levels)) return undefined;
        if (!isDetailMode(raw.details) || typeof raw.railHidden !== 'boolean') return undefined;
        return {
            filters: { channels: new Set(channels), levels: new Set(levels) },
            details: raw.details,
            railHidden: raw.railHidden
        };
    },
    serialize: ({ filters, details, railHidden }) => ({
        filters: { channels: [...filters.channels], levels: [...filters.levels] },
        details,
        railHidden
    })
};
