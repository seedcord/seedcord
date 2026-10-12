import { isPlainObject, isStringArray } from '@seedcord/utils/internal';

import { FILTER_LEVELS } from '#ui/components/primitives/FilterChips';

import type { StateFile } from '#core/state/StateFolder';
import type { LogLevel } from '@seedcord/types';

export interface DevPrefs {
    readonly channels: ReadonlySet<string>;
    readonly levels: ReadonlySet<LogLevel>;
}

const LEVEL_NAMES: ReadonlySet<string> = new Set(FILTER_LEVELS);

function isFilterLevels(values: readonly string[]): values is LogLevel[] {
    return values.every((value) => LEVEL_NAMES.has(value));
}

export const devPrefsFile: StateFile<DevPrefs> = {
    name: 'dev-prefs.json',
    defaults: { channels: new Set(), levels: new Set() },
    parse(raw) {
        if (!isPlainObject(raw) || !isStringArray(raw.channels) || !isStringArray(raw.levels)) return undefined;
        if (!isFilterLevels(raw.levels)) return undefined;
        return { channels: new Set(raw.channels), levels: new Set(raw.levels) };
    },
    serialize: ({ channels, levels }) => ({ channels: [...channels], levels: [...levels] })
};
