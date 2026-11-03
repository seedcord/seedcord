'use client';

import { useCallback, useTransition } from 'react';

interface Router {
    push: (href: string) => void;
}

export function useNavigateAndClose(router: Router, setOpen: (open: boolean) => void): (href: string) => void {
    const [, startTransition] = useTransition();
    // react commits this close together with the pushed page
    return useCallback(
        (href: string) =>
            startTransition(() => {
                router.push(href);
                setOpen(false);
            }),
        [router, setOpen]
    );
}
