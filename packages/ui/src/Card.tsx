import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { ComponentPropsWithoutRef, ElementType, HTMLAttributes, ReactElement } from 'react';

const cardBaseClassName = tw`relative border border-(--border)`;

const cardVariantClasses = {
    default: tw`rounded-lg bg-(--surface-subtle) shadow-(--shadow-card)`,
    flat: tw`rounded-lg bg-(--surface-subtle)`
} as const;

export type CardVariant = keyof typeof cardVariantClasses;

const cardSizeClasses = {
    none: tw`p-0`,
    sm: tw`p-3`,
    md: tw`p-4`,
    lg: tw`p-6`
} as const;

export type CardSize = keyof typeof cardSizeClasses;

export interface CardProps<Tag extends ElementType = 'div'> {
    as?: Tag;
    variant?: CardVariant;
    size?: CardSize;
    className?: string | undefined;
    children?: ComponentPropsWithoutRef<Tag>['children'];
}

// Use for grouped content surfaces (panels, cards, dialog bodies). Don't roll `border rounded bg-…`.
export function Card<Tag extends ElementType = 'div'>({
    as,
    variant = 'default',
    size = 'md',
    className,
    children,
    ...rest
}: CardProps<Tag> & Omit<ComponentPropsWithoutRef<Tag>, keyof CardProps<Tag>>): ReactElement {
    const Component = as ?? 'div';
    return (
        <Component
            {...rest}
            className={cn(cardBaseClassName, cardVariantClasses[variant], cardSizeClasses[size], className)}
        >
            {children}
        </Component>
    );
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
    return (
        <div {...props} className={cn('flex flex-col gap-1.5', className)}>
            {children}
        </div>
    );
}

export function CardBody({ children, className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
    return (
        <div {...props} className={cn('space-y-3', className)}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
    return (
        <div {...props} className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>): ReactElement {
    return (
        <h3 {...props} className={cn('text-base font-semibold tracking-tight text-(--text)', className)}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>): ReactElement {
    return (
        <p {...props} className={cn('text-sm text-(--text-muted)', className)}>
            {children}
        </p>
    );
}
