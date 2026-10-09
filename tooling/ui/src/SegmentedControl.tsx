'use client';

import { LayoutGroup, m } from 'motion/react';
import { useId } from 'react';

import { cn } from './lib/cn';
import { layoutSpring } from './lib/motion';
import { tw } from './lib/tw';

import type { ReactElement, ReactNode } from 'react';

const segmentedControlContainerClassName = cn(
    tw`inline-flex items-stretch border border-(--border) bg-(--surface-subtle)`,
    tw`rounded-md`
);

// heights track Button's sm and md
const segmentedControlContainerSizeClasses = {
    sm: tw`h-8`,
    md: tw`h-10`
} as const;

const segmentedControlOptionBaseClassName = cn(
    tw`relative inline-flex items-center justify-center gap-1.5`,
    tw`transition-colors duration-150 ease-out`,
    tw`focus-visible:outline-offset-(-2) focus-visible:z-1 focus-visible:outline-2 focus-visible:outline-(--focus-outline-b)`,
    tw`disabled:cursor-not-allowed disabled:opacity-45`
);

const segmentedControlVariants = {
    pill: {
        container: segmentedControlContainerClassName,
        option: cn(
            tw`font-medium text-(--text-muted) hover:text-(--text)`,
            tw`disabled:hover:text-(--text-muted) aria-checked:text-(--text-accent-b-faint)`
        ),
        indicator: tw`absolute inset-1 rounded-sm bg-(--surface-accent-b-moderate) shadow-(--shadow-card)`
    },
    underline: {
        container: tw`inline-flex items-end gap-3`,
        option: tw`cursor-pointer pb-1 font-mono text-sm text-(--seed-dark)/55 hover:text-(--seed-dark) aria-checked:text-(--seed-dark)`,
        indicator: tw`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-(--seed-dark)`
    }
} as const;

export type SegmentedControlVariant = keyof typeof segmentedControlVariants;

const segmentedControlOptionSizeClasses = {
    sm: tw`px-3 text-sm`,
    md: tw`px-4 text-sm`
} as const;

export type SegmentedControlSize = keyof typeof segmentedControlOptionSizeClasses;

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
    /** `underline` takes the home site's brand colors and ignores `size`. */
    variant?: SegmentedControlVariant;
    fullWidth?: boolean;
    className?: string;
    'aria-label'?: string;
}

export function SegmentedControl<TValue extends string>({
    options,
    value,
    onChange,
    size = 'md',
    variant = 'pill',
    fullWidth = false,
    className,
    'aria-label': ariaLabel
}: SegmentedControlProps<TValue>): ReactElement {
    const instanceId = useId();
    const layoutId = `seedcord-segmented-control-${instanceId}`;
    const isPill = variant === 'pill';
    const styles = segmentedControlVariants[variant];

    return (
        <LayoutGroup id={layoutId}>
            <div
                role="radiogroup"
                aria-label={ariaLabel}
                className={cn(
                    styles.container,
                    isPill && segmentedControlContainerSizeClasses[size],
                    fullWidth && tw`flex w-full`,
                    className
                )}
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
                                styles.option,
                                isPill && segmentedControlOptionSizeClasses[size],
                                fullWidth && tw`flex-1`
                            )}
                        >
                            {isActive ? (
                                <m.span
                                    layoutId={layoutId}
                                    aria-hidden
                                    transition={layoutSpring}
                                    className={cn(styles.indicator)}
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
