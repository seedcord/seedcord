'use client';

import { ChevronRight } from 'lucide-react';

import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ButtonHTMLAttributes, ReactElement, ReactNode, Ref } from 'react';

const caretTriggerBaseClassName = cn(
    tw`inline-flex items-center font-medium`,
    tw`transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out`,
    tw`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-outline-b)`,
    tw`disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50`
);

const caretTriggerVariantClasses = {
    default: tw`w-full justify-between gap-2 rounded-md border border-(--border) bg-(--bg-popover) text-(--text) hover:border-(--border-accent-b-subtle) aria-invalid:border-(--flesh) aria-invalid:focus-visible:outline-(--flesh) data-[state=open]:border-(--rind) data-[state=open]:bg-(--bg-accent-b-moderate)`,
    ghost: tw`gap-1 rounded-md px-1 py-0.5 text-(--text-muted) hover:text-(--text) data-[state=open]:text-(--rind)`
} as const;

export type CaretTriggerVariant = keyof typeof caretTriggerVariantClasses;

const caretTriggerSizeClasses = {
    sm: tw`h-8 px-3 text-sm`,
    md: tw`h-10 px-4 text-sm`
} as const;

export type CaretTriggerSize = keyof typeof caretTriggerSizeClasses;

export interface CaretTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label: ReactNode;
    open: boolean;
    variant?: CaretTriggerVariant | undefined;
    fieldSize?: CaretTriggerSize | undefined;
    leadingIcon?: ReactNode;
    ref?: Ref<HTMLButtonElement> | undefined;
}

export function CaretTrigger({
    label,
    open,
    variant = 'default',
    fieldSize = 'md',
    leadingIcon,
    className,
    ref,
    ...props
}: CaretTriggerProps): ReactElement {
    return (
        <button
            ref={ref}
            type="button"
            className={cn(
                caretTriggerBaseClassName,
                caretTriggerVariantClasses[variant],
                variant === 'default' ? caretTriggerSizeClasses[fieldSize] : '',
                className
            )}
            {...props}
        >
            {leadingIcon ? (
                <span aria-hidden className={cn('inline-flex shrink-0 items-center text-(--text-muted)')}>
                    {leadingIcon}
                </span>
            ) : null}
            <span className={cn('flex-1 truncate text-left')}>{label}</span>
            <ChevronRight
                size={16}
                aria-hidden
                className={cn('text-subtle shrink-0 transition-transform duration-200 ease-out', open && 'rotate-90')}
            />
        </button>
    );
}
