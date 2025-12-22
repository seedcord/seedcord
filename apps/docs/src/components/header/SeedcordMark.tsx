import Image from 'next/image';

import { cn } from '@lib/utils';

import type { ReactElement } from 'react';

interface SeedcordMarkProps {
    className?: string;
    textClassName?: string;
    showWordmark?: boolean;
}

function SeedcordMark({ className, textClassName, showWordmark = true }: SeedcordMarkProps): ReactElement {
    return (
        <span className={cn('flex items-center gap-2 select-none', className)}>
            <Image src="/logo.svg" alt="Seedcord logo" width={36} height={36} priority className="h-9 w-9" />
            {showWordmark ? (
                <span className={cn('text-lg font-semibold tracking-tight text-(--text)', textClassName)}>
                    seedcord
                </span>
            ) : null}
        </span>
    );
}

export default SeedcordMark;
