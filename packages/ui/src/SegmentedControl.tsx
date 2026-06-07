'use client';

import { LayoutGroup, m } from 'motion/react';
import { useId } from 'react';

import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ReactElement, ReactNode } from 'react';

const segmentedControlContainerClassName = [
    tw`inline-flex items-center border border-(--border) bg-(--surface-subtle)`,
    tw`rounded-lg`
].join(' ');

const segmentedControlOptionBaseClassName = [
    tw`relative inline-flex items-center justify-center gap-1.5 font-medium`,
    tw`transition-colors duration-150 ease-out`,
    tw`focus-visible:outline-offset-(-2) focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-(--focus-outline-b)`,
    tw`text-(--text-muted) hover:text-(--text)`,
    tw`aria-checked:text-(--text-accent-b-faint)`,
    tw`disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-(--text-muted)`
].join(' ');

const segmentedControlOptionSizeClasses = {
    sm: tw`px-3.5 py-1.5 text-xs`,
    md: tw`px-4 py-2 text-sm`
} as const;

export type SegmentedControlSize = keyof typeof segmentedControlOptionSizeClasses;

const segmentedControlActivePillClassName = tw`absolute inset-1 rounded-sm bg-(--surface-accent-b-moderate) shadow-(--shadow-card)`;

export interface SegmentedControlOption<TValue extends string> {
    value: TValue;
    label: ReactNode;
    leadingIcon?: ReactNode;
    disabled?: boolean;
}

export interface SegmentedControlProps<TValue extends string> {
    options: readonly SegmentedControlOption<TValue>[];
    value: TValue;
    onChange: (next: TValue) => void;
    size?: SegmentedControlSize;
    fullWidth?: boolean;
    className?: string;
    'aria-label'?: string;
}

const PILL_SPRING = { type: 'spring' as const, stiffness: 380, damping: 32 };

export function SegmentedControl<TValue extends string>({
    options,
    value,
    onChange,
    size = 'md',
    fullWidth = false,
    className,
    'aria-label': ariaLabel
}: SegmentedControlProps<TValue>): ReactElement {
    const instanceId = useId();
    const layoutId = `seedcord-segmented-control-${instanceId}`;

    return (
        <LayoutGroup id={layoutId}>
            <div
                role="radiogroup"
                aria-label={ariaLabel}
                className={cn(segmentedControlContainerClassName, fullWidth && tw`flex w-full`, className)}
            >
                {options.map((opt) => {
                    const isActive = opt.value === value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            disabled={opt.disabled}
                            onClick={() => onChange(opt.value)}
                            className={cn(
                                segmentedControlOptionBaseClassName,
                                segmentedControlOptionSizeClasses[size],
                                fullWidth && tw`flex-1`
                            )}
                        >
                            {isActive ? (
                                <m.span
                                    layoutId={layoutId}
                                    aria-hidden
                                    transition={PILL_SPRING}
                                    className={cn(segmentedControlActivePillClassName)}
                                />
                            ) : null}
                            <span className={cn('relative inline-flex items-center gap-1.5')}>
                                {opt.leadingIcon}
                                {opt.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </LayoutGroup>
    );
}
