'use client';

import { Slot } from '@radix-ui/react-slot';
import { forwardRef } from 'react';

import { cn, tw } from '@lib/utils';

import type { ButtonHTMLAttributes } from 'react';

const BASE_STYLES = tw`inline-flex items-center justify-center gap-2 rounded-lg border border-transparent font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-a)] disabled:cursor-not-allowed disabled:opacity-50`;

const VARIANTS = {
    primary: tw`shadow-soft bg-(--accent-a) text-white hover:bg-(--accent-a-hover) focus-visible:outline-(--accent-a)`,
    secondary: tw`shadow-soft bg-(--accent-b) text-black hover:bg-(--accent-b-hover)`,
    outline: tw`hover:bg-surface-subtle border-(--border) bg-transparent text-(--text) hover:border-(--accent-a)/60`,
    ghost: tw`bg-transparent text-(--text) hover:bg-(--bg-accent-a-transparent-subtle)`
} satisfies Record<string, string>;

const SIZES = {
    sm: tw`h-8 px-3 text-sm`,
    md: tw`h-10 px-4 text-sm`,
    lg: tw`h-12 px-6 text-base`,
    icon: tw`h-10 w-10 p-0`
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
