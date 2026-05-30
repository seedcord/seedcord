'use client';

import { Button, Icon, Popover, PopoverContent, PopoverTrigger, cn } from '@seedcord/ui';
import { Settings } from 'lucide-react';

import { ClearHistoryRow } from './settings/ClearHistoryRow';

import type { ReactElement } from 'react';

export function HeaderSettingsPopover(): ReactElement {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open documentation settings"
                    className={cn(
                        'text-(--text) transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--outline-accent-b-moderate)'
                    )}
                >
                    <Icon icon={Settings} size={18} />
                </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={12} align="end" className={cn('w-64 text-sm')}>
                <ClearHistoryRow />
            </PopoverContent>
        </Popover>
    );
}
