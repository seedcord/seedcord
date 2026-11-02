import { X } from 'lucide-react';

import { Button } from './Button';
import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { cn } from './lib/cn';

import type { ReactElement } from 'react';

// phones don't have an Esc key
export function CloseControls({ onClose, label }: { onClose: () => void; label: string }): ReactElement {
    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={label}
                className={cn('text-subtle size-9 rounded-md hover:text-(--text) sm:hidden')}
            >
                <Icon icon={X} size={16} aria-hidden />
            </Button>
            <Button
                variant="ghost"
                size="none"
                onClick={onClose}
                aria-label={label}
                className={cn('group hidden hover:bg-transparent sm:inline-flex')}
            >
                <Kbd className={cn('uppercase group-hover:text-(--text)')}>Esc</Kbd>
            </Button>
        </>
    );
}
