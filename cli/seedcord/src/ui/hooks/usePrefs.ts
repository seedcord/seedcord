import { useState } from 'react';

import { nextDetailMode } from '#ui/LogLayout';

import type { DevPrefs, LogFilters } from '#ui/devPrefs';

interface Prefs extends DevPrefs {
    readonly setFilters: (filters: LogFilters) => void;
    readonly toggleRail: () => void;
    readonly cycleDetails: () => void;
}

export function usePrefs(initial: DevPrefs, onChange?: (prefs: DevPrefs) => void): Prefs {
    const [prefs, setPrefs] = useState(initial);

    const update = (patch: Partial<DevPrefs>): void => {
        const next = { ...prefs, ...patch };
        setPrefs(next);
        onChange?.(next);
    };

    return {
        ...prefs,
        setFilters: (filters) => update({ filters }),
        toggleRail: () => update({ railHidden: !prefs.railHidden }),
        cycleDetails: () => update({ details: nextDetailMode(prefs.details) })
    };
}
