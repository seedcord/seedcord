'use client';

import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { InputHTMLAttributes, ReactElement, ReactNode, Ref } from 'react';

const inputWrapperBaseClassName = [
    tw`flex items-center gap-2 rounded-lg`,
    tw`transition-[color,background-color,border-color,box-shadow] duration-150 ease-out`,
    tw`has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50`
].join(' ');

const inputVariantClasses = {
    default: tw`border border-(--border) bg-transparent focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--focus-outline-b)`,
    // No chrome of its own; the consumer styles the wrapper via `className` (e.g. a search header with
    // its own border + focus-within treatment). Keeps the flex/gap/sizing from the base + size classes.
    ghost: ''
} as const;

export type InputVariant = keyof typeof inputVariantClasses;

const inputSizeClasses = {
    sm: tw`h-8 px-2.5 text-sm`,
    md: tw`h-10 px-3 text-sm`,
    lg: tw`h-12 px-4 text-base`
} as const;

export type InputSize = keyof typeof inputSizeClasses;

// `size` is omitted from the native attrs (a numeric character-width) and reused for the design scale.
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
    variant?: InputVariant;
    size?: InputSize;
    leading?: ReactNode;
    trailing?: ReactNode;
    // Wrapper class override; `inputClassName` targets the inner <input>.
    inputClassName?: string;
    ref?: Ref<HTMLInputElement>;
}

const slotClassName = tw`flex shrink-0 items-center text-subtle`;

export function Input({
    className,
    inputClassName,
    variant = 'default',
    size = 'md',
    type = 'text',
    leading,
    trailing,
    ref,
    ...props
}: InputProps): ReactElement {
    return (
        <div className={cn(inputWrapperBaseClassName, inputVariantClasses[variant], inputSizeClasses[size], className)}>
            {leading ? <span className={slotClassName}>{leading}</span> : null}
            <input
                ref={ref}
                type={type}
                className={cn(
                    // pointer-coarse:text-base pins the font to 16px on touch devices; iOS Safari zooms a focused input under 16px.
                    tw`min-w-0 flex-1 bg-transparent text-(--text) outline-hidden pointer-coarse:text-base placeholder:text-subtle`,
                    inputClassName
                )}
                {...props}
            />
            {trailing ? <span className={slotClassName}>{trailing}</span> : null}
        </div>
    );
}
