import { useState } from 'react';

import type { LogFilters } from '#ui/devPrefs';
import type { FilterPlace } from '#ui/Screen';

interface Filters {
    readonly filters: LogFilters;
    readonly setFilters: (next: LogFilters) => void;
    readonly open: boolean;
    readonly toggleOpen: () => void;
}

export function useFilters(initial: LogFilters, place: FilterPlace, onChange?: (filters: LogFilters) => void): Filters {
    const [filters, setFilters] = useState(initial);
    const [open, setOpen] = useState(false);
    const [lastPlace, setLastPlace] = useState(place);

    // react's pattern for resetting state when a prop changes, applied during render
    if (place !== lastPlace) {
        setLastPlace(place);
        if (place === 'rail-always') setOpen(false);
    }

    const changeFilters = (next: LogFilters): void => {
        setFilters(next);
        onChange?.(next);
    };

    return { filters, setFilters: changeFilters, open, toggleOpen: () => setOpen(!open) };
}
