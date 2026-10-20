import { isPlainObject, isStringArray } from '@seedcord/utils/internal';

import { FILTER_LEVELS } from '#ui/components/primitives/FilterChips';

import type { StateFile } from '#core/state/StateFolder';
import type { LogLevel } from '@seedcord/types';

export interface LogFilters {
    readonly channels: ReadonlySet<string>;
    readonly levels: ReadonlySet<LogLevel>;
}

export interface DevPrefs {
    readonly filters: LogFilters;
    readonly fullDetails: boolean;
    readonly railHidden: boolean;
}

const LEVEL_NAMES: ReadonlySet<string> = new Set(FILTER_LEVELS);

function isFilterLevels(values: readonly string[]): values is LogLevel[] {
    return values.every((value) => LEVEL_NAMES.has(value));
}

export const devPrefsFile: StateFile<DevPrefs> = {
    name: 'dev-prefs.json',
    defaults: { filters: { channels: new Set(), levels: new Set() }, fullDetails: false, railHidden: false },
    parse(raw) {
        if (!isPlainObject(raw) || !isPlainObject(raw.filters)) return undefined;
        const { channels, levels } = raw.filters;
        if (!isStringArray(channels) || !isStringArray(levels) || !isFilterLevels(levels)) return undefined;
        if (typeof raw.fullDetails !== 'boolean' || typeof raw.railHidden !== 'boolean') return undefined;
        return {
            filters: { channels: new Set(channels), levels: new Set(levels) },
            fullDetails: raw.fullDetails,
            railHidden: raw.railHidden
        };
    },
    serialize: ({ filters, fullDetails, railHidden }) => ({
        filters: { channels: [...filters.channels], levels: [...filters.levels] },
        fullDetails,
        railHidden
    })
};
