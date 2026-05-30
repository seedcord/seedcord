'use client';

import { Button, cn } from '@seedcord/ui';
import { Menu } from 'lucide-react';

import type { ReactElement } from 'react';

export function MobileNavigationToggle({ onOpen }: { onOpen: () => void }): ReactElement {
    return (
        <div className={cn('flex flex-col gap-3 px-3 pt-5 md:px-5 lg:hidden')}>
            <div className={cn('flex flex-wrap gap-2')}>
                <Button
                    variant="outline"
                    className={cn('bg-surface min-w-37.5 flex-1 justify-center gap-2 text-sm text-(--text)')}
                    onClick={onOpen}
                    aria-label="Open navigation menu"
                >
                    <Menu className={cn('size-4')} aria-hidden />
                    Browse navigation
                </Button>
            </div>
        </div>
    );
}
