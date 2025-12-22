'use client';

import { Slot } from '@radix-ui/react-slot';
import { forwardRef } from 'react';

import { cn } from '@lib/utils';

import type { ButtonHTMLAttributes } from 'react';

const BASE_STYLES =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-transparent font-medium transition focus-visible:outline-2 focus-visible:outline-[var(--accent-a)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
    primary: 'bg-(--accent-a) text-white shadow-soft hover:bg-(--accent-a-hover) focus-visible:outline-(--accent-a)',
    secondary: 'bg-[var(--accent-b)] text-black shadow-soft hover:bg-[color-mix(in_oklab,var(--accent-b)_92%,black)]',
    outline: 'border-(--border) bg-transparent text-(--text) hover:border-(--accent-a)/60 hover:bg-surface-96',
    ghost: 'bg-transparent text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--accent-a)_12%,transparent)]'
} satisfies Record<string, string>;

const SIZES = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
    icon: 'h-10 w-10 p-0'
} satisfies Record<string, string>;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: keyof typeof VARIANTS;
    size?: keyof typeof SIZES;
    asChild?: boolean;
    showOutline?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', type = 'button', asChild = false, ...props }: ButtonProps, ref) => {
        const Component = asChild ? Slot : 'button';

        return (
            <Component
                ref={ref}
                type={asChild ? undefined : type}
                className={cn(BASE_STYLES, VARIANTS[variant], SIZES[size], className)}
                {...props}
            />
        );
    }
);

Button.displayName = 'Button';

export default Button;
