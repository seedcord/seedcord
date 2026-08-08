'use client';

import { Slot } from '@radix-ui/react-slot';

import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ButtonHTMLAttributes, ReactElement, Ref } from 'react';

const buttonBaseClassName = cn(
    tw`inline-flex items-center justify-center gap-2`,
    tw`border border-transparent font-medium`,
    tw`rounded-md`,
    // GPU-promote so the first :active scale doesn't paint-stall on press.
    tw`transform-[translateZ(0)] will-change-transform backface-hidden`,
    tw`active:transform-[translateZ(0)_scale(0.97)] disabled:active:transform-[translateZ(0)]`,
    tw`transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out`,
    tw`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-outline-b)`,
    tw`disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50`
);

const buttonVariantClasses = {
    primary: tw`shadow-soft bg-(--flesh) text-white hover:bg-(--flesh-hover)`,
    secondary: tw`shadow-soft bg-(--rind) text-black hover:bg-(--rind-hover)`,
    outline: tw`border-(--border) bg-transparent text-(--text) hover:border-(--border-accent-a-subtle) hover:bg-(--surface-subtle)`,
    ghost: tw`bg-transparent text-(--text) hover:bg-(--flesh-transparent-subtle)`
} as const;

export type ButtonVariant = keyof typeof buttonVariantClasses;

const buttonSizeClasses = {
    sm: tw`h-8 px-3 text-sm`,
    md: tw`h-10 px-4 text-sm`,
    lg: tw`h-12 px-6 text-base`,
    icon: tw`size-10 p-0`
} as const;

export type ButtonSize = keyof typeof buttonSizeClasses;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    asChild?: boolean;
    ref?: Ref<HTMLButtonElement>;
}

export function Button({
    className,
    variant = 'primary',
    size = 'md',
    type = 'button',
    asChild = false,
    ref,
    ...props
}: ButtonProps): ReactElement {
    const Component = asChild ? Slot : 'button';
    return (
        <Component
            ref={ref}
            type={asChild ? undefined : type}
            className={cn(buttonBaseClassName, buttonVariantClasses[variant], buttonSizeClasses[size], className)}
            {...props}
        />
    );
}
