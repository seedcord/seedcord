import { useState } from 'react';

import type { FilterPlace } from '#ui/Screen';

interface FilterPanel {
    readonly open: boolean;
    readonly toggleOpen: () => void;
}

export function useFilterPanel(place: FilterPlace): FilterPanel {
    const [open, setOpen] = useState(false);
    const [lastPlace, setLastPlace] = useState(place);

    // react's pattern for resetting state when a prop changes, applied during render
    if (place !== lastPlace) {
        setLastPlace(place);
        if (place === 'rail-always') setOpen(false);
    }

    return { open, toggleOpen: () => setOpen(!open) };
}
