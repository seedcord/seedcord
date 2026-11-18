'use client';

import { cn } from 'cn';
import { LayoutGroup, m } from 'motion/react';
import { useId } from 'react';

import { layoutSpring } from './lib/motion';
import { tw } from './lib/tw';

import type { ComponentProps, KeyboardEvent, ReactElement, ReactNode } from 'react';

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
            tw`disabled:hover:text-(--text-muted) data-active:text-(--text-accent-b-faint)`
        ),
        indicator: tw`absolute inset-1 rounded-sm bg-(--surface-accent-b-moderate) shadow-(--shadow-card)`
    },
    underline: {
        container: tw`inline-flex items-end gap-3`,
        option: tw`cursor-pointer pb-1 font-mono text-sm text-(--seed-dark)/55 hover:text-(--seed-dark) data-active:text-(--seed-dark)`,
        indicator: tw`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-(--seed-dark)`
    }
} as const;

export type SegmentedControlVariant = keyof typeof segmentedControlVariants;

const segmentedControlOptionSizeClasses = {
    sm: tw`px-3 text-sm`,
    md: tw`px-4 text-sm`
} as const;

export type SegmentedControlSize = keyof typeof segmentedControlOptionSizeClasses;

const ARROW_STEPS: Partial<Record<string, 1 | -1>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

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
    /** Shows the options as tabs. Render each option's panel with the ids from `segmentIds(tabsPrefix, index)`. */
    tabsPrefix?: string | undefined;
}

/** The ids that link a tab to its panel when a {@link SegmentedControl} renders as tabs. */
export function segmentIds(prefix: string, index: number): { tab: string; panel: string } {
    return { tab: `${prefix}-tab-${String(index)}`, panel: `${prefix}-panel-${String(index)}` };
}

function optionAria(
    tabsPrefix: string | undefined,
    index: number,
    isActive: boolean
): Pick<ComponentProps<'button'>, 'role' | 'id' | 'aria-controls' | 'aria-selected' | 'aria-checked'> {
    if (tabsPrefix === undefined) return { role: 'radio', 'aria-checked': isActive };
    const ids = segmentIds(tabsPrefix, index);
    return { role: 'tab', id: ids.tab, 'aria-controls': ids.panel, 'aria-selected': isActive };
}

export function SegmentedControl<TValue extends string>({
    options,
    value,
    onChange,
    size = 'md',
    variant = 'pill',
    fullWidth = false,
    className,
    'aria-label': ariaLabel,
    tabsPrefix
}: SegmentedControlProps<TValue>): ReactElement {
    const instanceId = useId();
    const layoutId = `seedcord-segmented-control-${instanceId}`;
    const isPill = variant === 'pill';
    const styles = segmentedControlVariants[variant];

    const moveSelection = (event: KeyboardEvent<HTMLDivElement>): void => {
        const step = ARROW_STEPS[event.key];
        if (step === undefined) return;
        event.preventDefault();
        const enabled = options.filter((opt) => opt.disabled !== true);
        const at = enabled.findIndex((opt) => opt.value === value);
        const next = enabled[(at + step + enabled.length) % enabled.length];
        if (next === undefined) return;
        onChange(next.value);
        event.currentTarget.querySelectorAll('button')[options.indexOf(next)]?.focus();
    };

    return (
        <LayoutGroup id={layoutId}>
            <div
                role={tabsPrefix === undefined ? 'radiogroup' : 'tablist'}
                aria-label={ariaLabel}
                onKeyDown={moveSelection}
                className={cn(
                    styles.container,
                    isPill && segmentedControlContainerSizeClasses[size],
                    fullWidth && tw`flex w-full`,
                    className
                )}
            >
                {options.map((opt, index) => {
                    const isActive = opt.value === value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            {...optionAria(tabsPrefix, index, isActive)}
                            data-active={isActive || undefined}
                            tabIndex={isActive ? 0 : -1}
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
