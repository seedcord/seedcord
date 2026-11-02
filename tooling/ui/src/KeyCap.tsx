import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CornerDownLeft } from 'lucide-react';

import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { cn } from './lib/cn';

import type { IconComponent } from './Icon';
import type { KbdSize } from './Kbd';
import type { ReactElement } from 'react';
import type { LiteralUnion } from 'type-fest';

export interface KeyCap {
    label: string;
    face: IconComponent | string;
    // the key's name in aria-keyshortcuts
    aria: string;
}

const NAMED_KEYS = {
    ArrowUp: { label: 'Up', face: ArrowUp },
    ArrowDown: { label: 'Down', face: ArrowDown },
    ArrowLeft: { label: 'Left', face: ArrowLeft },
    ArrowRight: { label: 'Right', face: ArrowRight },
    Enter: { label: 'Enter', face: CornerDownLeft },
    Tab: { label: 'Tab', face: 'Tab' }
} satisfies Record<string, Omit<KeyCap, 'aria'>>;

type NamedKey = keyof typeof NAMED_KEYS;

export type KeyName = LiteralUnion<NamedKey, string>;

const isNamedKey = (key: string): key is NamedKey => Object.hasOwn(NAMED_KEYS, key);

export function keyCap(key: KeyName): KeyCap {
    if (isNamedKey(key)) return { ...NAMED_KEYS[key], aria: key };
    const face = key.toUpperCase();
    return { label: face, face, aria: face };
}

const ICON_SIZES: Record<KbdSize, number> = { sm: 10, md: 12 };

// screen readers skip an aria-label on a kbd
export function Cap({ cap, size = 'sm' }: { cap: KeyCap; size?: KbdSize }): ReactElement {
    return (
        <Kbd size={size}>
            {typeof cap.face === 'string' ? (
                <span aria-hidden>{cap.face}</span>
            ) : (
                <Icon icon={cap.face} size={ICON_SIZES[size]} />
            )}
            <span className={cn('sr-only')}>{cap.label}</span>
        </Kbd>
    );
}
