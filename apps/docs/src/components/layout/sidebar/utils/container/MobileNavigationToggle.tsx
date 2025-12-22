'use client';

import { Menu } from 'lucide-react';

import Button from '@ui/Button';

import type { ReactElement } from 'react';

function MobileNavigationToggle({ onOpen }: { onOpen: () => void }): ReactElement {
    return (
        <div className="flex flex-col gap-3 px-3 pt-5 md:px-5 lg:hidden">
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    className="bg-surface min-w-[150px] flex-1 justify-center gap-2 text-sm text-(--text)"
                    onClick={onOpen}
                    aria-label="Open navigation menu"
                >
                    <Menu className="h-4 w-4" aria-hidden />
                    Browse navigation
                </Button>
            </div>
        </div>
    );
}

export default MobileNavigationToggle;
