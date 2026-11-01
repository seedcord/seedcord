'use client';

import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { MouseEvent, ReactElement, ReactNode } from 'react';

export const SEARCH_OPTION_BOX = tw`mt-1 flex items-center gap-3 rounded-md border border-transparent p-3 text-sm first:mt-0`;

const ACTIVE = tw`data-[active=true]:border-(--rind)/38 data-[active=true]:bg-(--rind)/16`;

function isModifiedClick(event: MouseEvent): boolean {
    return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export interface SearchOptionProps {
    id: string;
    href: string;
    label: string;
    isActive: boolean;
    onSelect: () => void;
    onActivate: () => void;
    className?: string | undefined;
    children: ReactNode;
}

// the browser gives an <a> middle-click, cmd-click and the link context menu
export function SearchOption({
    id,
    href,
    label,
    isActive,
    onSelect,
    onActivate,
    className,
    children
}: SearchOptionProps): ReactElement {
    return (
        <a
            id={id}
            href={href}
            role="option"
            aria-label={label}
            aria-selected={isActive}
            data-active={isActive || undefined}
            // the search field keeps focus and moves the active option
            tabIndex={-1}
            onClick={(event) => {
                if (isModifiedClick(event)) return;
                event.preventDefault();
                onSelect();
            }}
            onMouseMove={onActivate}
            className={cn(
                SEARCH_OPTION_BOX,
                'text-(--text) outline-hidden transition',
                // scrollIntoView block:'nearest' stops at this margin
                'scroll-my-3',
                ACTIVE,
                className
            )}
        >
            {children}
        </a>
    );
}
