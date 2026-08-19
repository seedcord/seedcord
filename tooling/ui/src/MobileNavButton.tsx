'use client';

import { Menu } from 'lucide-react';

import { Button } from './Button';
import { Icon } from './Icon';
import { cn } from './lib/cn';

import type { ReactElement } from 'react';

export interface MobileNavButtonProps {
    open: boolean;
    onOpen: () => void;
    label?: string;
    className?: string | undefined;
}

export function MobileNavButton({
    open,
    onOpen,
    label = 'Open navigation menu',
    className
}: MobileNavButtonProps): ReactElement {
    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn('text-(--text)', className)}
            onClick={onOpen}
        >
            <Icon icon={Menu} size={20} />
        </Button>
    );
}
