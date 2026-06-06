import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { HTMLAttributes, ReactElement, Ref } from 'react';

const badgeBaseClassName = tw`inline-flex items-center gap-1 rounded-full border whitespace-nowrap`;

const badgeVariantClasses = {
    status: tw`px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider uppercase`,
    chip: tw`px-2 py-0.5 text-xs font-medium`
} as const;

export type BadgeVariant = keyof typeof badgeVariantClasses;

const badgeToneClasses = {
    neutral: tw`border-(--border) bg-(--surface-subtle) text-(--text-muted)`,
    accent: tw`border-(--badge-package-border) bg-(--badge-package-bg) text-(--badge-package-text)`,
    danger: tw`border-(--badge-page-border) bg-(--badge-page-bg) text-(--badge-page-text)`,
    muted: tw`border-(--badge-resource-border) bg-(--badge-resource-bg) text-(--badge-resource-text)`
} as const;

export type BadgeTone = keyof typeof badgeToneClasses;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    tone?: BadgeTone;
    ref?: Ref<HTMLSpanElement>;
}

// Use for short status/category tags. Don't roll `border rounded-full…` spans.
export function Badge({ variant = 'status', tone = 'neutral', className, ...props }: BadgeProps): ReactElement {
    return (
        <span
            {...props}
            className={cn(badgeBaseClassName, badgeVariantClasses[variant], badgeToneClasses[tone], className)}
        />
    );
}
