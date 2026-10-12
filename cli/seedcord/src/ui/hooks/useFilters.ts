import { useState } from 'react';

import type { LogFilters } from '#ui/devPrefs';
import type { Tier } from '#ui/tier';

export type FilterView = 'always' | 'shown' | 'collapsed';

interface Filters {
    readonly filters: LogFilters;
    readonly setFilters: (next: LogFilters) => void;
    readonly view: FilterView;
    readonly toggleView: () => void;
}

export function useFilters(initial: LogFilters, tier: Tier, onChange?: (filters: LogFilters) => void): Filters {
    const [filters, setFilters] = useState(initial);
    const [shown, setShown] = useState(false);
    const [lastTier, setLastTier] = useState(tier);

    // react's pattern for resetting state when a prop changes, applied during render
    if (tier !== lastTier) {
        setLastTier(tier);
        if (tier === 'full') setShown(false);
    }

    const changeFilters = (next: LogFilters): void => {
        setFilters(next);
        onChange?.(next);
    };

    return {
        filters,
        setFilters: changeFilters,
        view: tier === 'full' ? 'always' : shown ? 'shown' : 'collapsed',
        toggleView: () => setShown(!shown)
    };
}
