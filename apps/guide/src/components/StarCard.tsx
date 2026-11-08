import { Button, Icon, cn } from '@seedcord/ui';
import { ArrowUpRight, Star } from 'lucide-react';

import { REPO_URL } from '#lib/site';

import type { ReactElement } from 'react';

export function StarCard(): ReactElement {
    return (
        <Button asChild variant="field" size="none" className={cn('flex-col items-start gap-1 p-3')}>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
                <span className={cn('flex items-center gap-1 text-sm font-semibold')}>
                    <Icon icon={Star} size={20} className={cn('fill-current stroke-none text-(--flesh)')} />
                    Enjoying seedcord?
                </span>
                <span className={cn('flex items-center gap-0.5 text-xs text-(--text-muted)')}>
                    Leave a star on GitHub
                    <Icon icon={ArrowUpRight} size={12} />
                </span>
            </a>
        </Button>
    );
}
