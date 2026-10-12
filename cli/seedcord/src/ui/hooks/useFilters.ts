import { useState } from 'react';

import type { DevPrefs } from '#ui/devPrefs';
import type { LogLevel } from '@seedcord/types';

interface Filters {
    readonly filters: DevPrefs;
    readonly setChannels: (channels: ReadonlySet<string>) => void;
    readonly setLevels: (levels: ReadonlySet<LogLevel>) => void;
    readonly shown: boolean;
    readonly toggleShown: () => void;
}

export function useFilters(initial: DevPrefs, onChange?: (filters: DevPrefs) => void): Filters {
    const [filters, setFilters] = useState(initial);
    const [shown, setShown] = useState(false);

    const change = (next: DevPrefs): void => {
        setFilters(next);
        onChange?.(next);
    };

    return {
        filters,
        setChannels: (channels) => change({ ...filters, channels }),
        setLevels: (levels) => change({ ...filters, levels }),
        shown,
        toggleShown: () => setShown(!shown)
    };
}
