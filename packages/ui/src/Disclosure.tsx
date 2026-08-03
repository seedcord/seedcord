'use client';

import { ChevronDown } from 'lucide-react';
import { createContext, use, useCallback, useEffect, useId, useMemo, useState } from 'react';

import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, HTMLAttributes, ReactElement, ReactNode } from 'react';

const disclosureTriggerBaseClassName = cn(
    tw`flex w-full cursor-pointer items-center gap-2 text-left`,
    tw`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-outline-b)`
);

const disclosureChevronBaseClassName = tw`shrink-0 text-(--text-muted) transition-transform duration-200 ease-out data-[state=closed]:-rotate-90`;

const disclosurePanelBaseClassName = tw`grid min-w-0 transition-[grid-template-rows,opacity] duration-300 ease-out data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100`;

// `min-w-0` is load-bearing: grid items default to `min-width: auto` (content-size), which
// would inflate this column with any wide descendant (e.g. a CodeBlock with a long line) and
// defeat downstream `overflow-x: auto` clipping.
const disclosurePanelInnerClassName = tw`min-h-0 min-w-0 overflow-y-clip`;

interface DisclosureContextValue {
    open: boolean;
    setOpen: (next: boolean) => void;
    panelId: string;
}

const DisclosureContext = createContext<DisclosureContextValue | null>(null);

function useDisclosureContext(componentName: string): DisclosureContextValue {
    const ctx = use(DisclosureContext);
    if (!ctx) throw new Error(`${componentName} must be rendered inside <Disclosure>`);
    return ctx;
}

export interface DisclosureProps {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    /**
     * If provided, the open/close state is persisted to localStorage under this key.
     * Only effective when the Disclosure is uncontrolled (no `open` prop).
     */
    storageKey?: string;
    children: ReactNode;
    className?: string;
}

export function Disclosure({
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    storageKey,
    children,
    className
}: DisclosureProps): ReactElement {
    const panelId = useId();
    const isControlled = controlledOpen !== undefined;
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const open = isControlled ? controlledOpen : internalOpen;

    useEffect(() => {
        if (!storageKey || isControlled) return;
        try {
            const saved = globalThis.localStorage.getItem(storageKey);
            if (saved !== null) setInternalOpen(saved === 'true');
        } catch {
            // localStorage can throw in private mode + SSR fallback; ignore.
        }
    }, [storageKey, isControlled]);

    const setOpen = useCallback(
        (next: boolean): void => {
            if (!isControlled) setInternalOpen(next);
            onOpenChange?.(next);
            if (storageKey && !isControlled) {
                try {
                    globalThis.localStorage.setItem(storageKey, String(next));
                } catch {
                    // same swallow reason as the read above
                }
            }
        },
        [isControlled, onOpenChange, storageKey]
    );

    const value = useMemo(() => ({ open, setOpen, panelId }), [open, setOpen, panelId]);

    return (
        <DisclosureContext value={value}>
            <div className={cn(className)}>{children}</div>
        </DisclosureContext>
    );
}

export interface DisclosureTriggerProps extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'type' | 'aria-expanded' | 'aria-controls'
> {
    children: ReactNode;
}

export function DisclosureTrigger({ className, children, onClick, ...props }: DisclosureTriggerProps): ReactElement {
    const { open, setOpen, panelId } = useDisclosureContext('DisclosureTrigger');
    return (
        <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={(event) => {
                onClick?.(event);
                if (!event.defaultPrevented) setOpen(!open);
            }}
            className={cn(disclosureTriggerBaseClassName, className)}
            {...props}
        >
            {children}
        </button>
    );
}

export interface DisclosureChevronProps extends Omit<ComponentPropsWithoutRef<typeof ChevronDown>, 'aria-hidden'> {}

export function DisclosureChevron({ className, size = 16, ...props }: DisclosureChevronProps): ReactElement {
    const { open } = useDisclosureContext('DisclosureChevron');
    return (
        <ChevronDown
            size={size}
            aria-hidden
            data-state={open ? 'open' : 'closed'}
            className={cn(disclosureChevronBaseClassName, className)}
            {...props}
        />
    );
}

export interface DisclosurePanelProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
}

export function DisclosurePanel({ children, className, ...props }: DisclosurePanelProps): ReactElement {
    const { open, panelId } = useDisclosureContext('DisclosurePanel');
    return (
        <div
            {...props}
            id={panelId}
            aria-hidden={!open}
            data-state={open ? 'open' : 'closed'}
            className={cn(disclosurePanelBaseClassName, className)}
        >
            <div className={cn(disclosurePanelInnerClassName)}>{children}</div>
        </div>
    );
}
