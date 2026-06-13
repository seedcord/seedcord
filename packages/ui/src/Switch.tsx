'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import { useId } from 'react';

import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ReactElement, ReactNode } from 'react';

const switchRootBaseClassName = [
    tw`relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-(--border) p-0.5`,
    tw`bg-(--accent-r) transition-colors duration-150 ease-out`,
    tw`data-[state=checked]:border-(--accent-b) data-[state=checked]:bg-(--accent-b)`,
    tw`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-outline-b)`,
    tw`disabled:cursor-not-allowed disabled:opacity-45`
].join(' ');

const switchRootSizeClasses = {
    sm: tw`h-5 w-9`,
    md: tw`h-6 w-11`
} as const;

const switchThumbBaseClassName = [
    tw`pointer-events-none block rounded-full bg-(--switch-thumb) shadow-(--shadow-card)`,
    tw`transition-transform duration-150 ease-out`
].join(' ');

// Thumb height equals the track's inner height (track minus border minus p-0.5 both sides) so it sits
// with a uniform 2px inset, and the translate equals inner-width minus thumb so on and off are symmetric.
const switchThumbSizeClasses = {
    sm: tw`size-3.5 data-[state=checked]:translate-x-4`,
    md: tw`size-4.5 data-[state=checked]:translate-x-5`
} as const;

const switchLabelSizeClasses = {
    sm: tw`text-xs`,
    md: tw`text-sm`
} as const;

export type SwitchSize = keyof typeof switchRootSizeClasses;

export interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: ReactNode;
    disabled?: boolean;
    id?: string;
    size?: SwitchSize;
    className?: string;
    'aria-label'?: string;
}

export function Switch({
    checked,
    onCheckedChange,
    label,
    disabled,
    id,
    size = 'md',
    className,
    'aria-label': ariaLabel
}: SwitchProps): ReactElement {
    const generatedId = useId();
    const switchId = id ?? generatedId;

    const control = (
        <SwitchPrimitive.Root
            id={switchId}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled}
            aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
            className={cn(switchRootBaseClassName, switchRootSizeClasses[size], label ? undefined : className)}
        >
            <SwitchPrimitive.Thumb className={cn(switchThumbBaseClassName, switchThumbSizeClasses[size])} />
        </SwitchPrimitive.Root>
    );

    if (!label) {
        return control;
    }

    return (
        <label
            htmlFor={switchId}
            className={cn(
                'inline-flex items-center gap-2 text-(--text)',
                disabled && tw`cursor-not-allowed opacity-60`,
                className
            )}
        >
            {control}
            <span className={cn(switchLabelSizeClasses[size])}>{label}</span>
        </label>
    );
}
