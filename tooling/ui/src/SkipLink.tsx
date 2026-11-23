import { cn } from 'cn';

import { Button } from './Button';

import type { ReactElement } from 'react';

export const MAIN_CONTENT_ID = 'main-content';

export function SkipLink(): ReactElement {
    return (
        <Button
            asChild
            variant="secondary"
            className={cn('fixed top-4 left-4 z-100 -translate-y-24 focus-visible:translate-y-0')}
        >
            <a href={`#${MAIN_CONTENT_ID}`}>Skip to content</a>
        </Button>
    );
}
