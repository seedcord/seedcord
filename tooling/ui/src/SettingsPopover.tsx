'use client';

import { Settings } from 'lucide-react';

import { Button } from './Button';
import { Icon } from './Icon';
import { cn } from './lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

import type { ReactElement, ReactNode } from 'react';

export interface SettingsPopoverProps {
    label: string;
    children: ReactNode;
    className?: string | undefined;
}

export function SettingsPopover({ label, children, className }: SettingsPopoverProps): ReactElement {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={label} className={cn('text-(--text)', className)}>
                    <Icon icon={Settings} size={18} />
                </Button>
            </PopoverTrigger>
            <PopoverContent sideOffset={12} align="end" className={cn('w-64 text-sm')}>
                {children}
            </PopoverContent>
        </Popover>
    );
}
