import { useState } from 'react';

interface ViewPrefs {
    readonly railHidden: boolean;
    readonly fullDetails: boolean;
    readonly toggleRail: () => void;
    readonly toggleDetails: () => void;
}

export function useViewPrefs(): ViewPrefs {
    const [railHidden, setRailHidden] = useState(false);
    const [fullDetails, setFullDetails] = useState(false);
    return {
        railHidden,
        fullDetails,
        toggleRail: () => setRailHidden(!railHidden),
        toggleDetails: () => setFullDetails(!fullDetails)
    };
}
