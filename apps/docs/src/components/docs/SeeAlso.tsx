import { cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

export function SeeAlso({
    entries
}: {
    entries?: readonly { name: string; href?: string; external?: boolean }[] | undefined;
}): ReactElement | null {
    if (!entries || entries.length === 0) return null;

    return (
        <p className={cn('text-subtle flex flex-wrap items-baseline gap-2')}>
            <span className={cn('font-semibold text-(--text)')}>See also:</span>
            <span className={cn('min-w-0')}>
                {entries.map((s, i) => (
                    <span key={s.href ?? s.name} className={cn('inline')}>
                        {s.href ? (
                            <a
                                href={s.href}
                                target={s.external ? '_blank' : undefined}
                                rel={s.external ? 'noopener noreferrer' : undefined}
                                className={cn('link underline', s.external && 'cross-ref')}
                            >
                                {s.name}
                            </a>
                        ) : (
                            <span>{s.name}</span>
                        )}
                        {i < entries.length - 1 ? ', ' : ''}
                    </span>
                ))}
            </span>
        </p>
    );
}
