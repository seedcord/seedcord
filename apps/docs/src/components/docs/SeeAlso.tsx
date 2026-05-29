import { cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

function SeeAlso({
    entries
}: {
    entries?: readonly { name: string; href?: string }[] | undefined;
}): ReactElement | null {
    if (!entries || entries.length === 0) return null;

    return (
        <p className={cn('text-subtle flex flex-wrap items-baseline gap-2')}>
            <span className={cn('font-semibold text-(--text)')}>See also:</span>
            <span className={cn('min-w-0')}>
                {entries.map((s, i) => (
                    <span key={s.href ?? s.name} className={cn('inline')}>
                        {s.href ? (
                            <a href={s.href} className={cn('link underline')}>
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

export default SeeAlso;
