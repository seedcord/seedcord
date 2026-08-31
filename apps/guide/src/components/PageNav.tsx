import { Button, Icon, cn, tw } from '@seedcord/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import type { GuidePage, PageNeighbours } from '#lib/neighbours';
import type { ReactElement } from 'react';

const DIRECTIONS = {
    prev: {
        label: 'Previous',
        icon: ChevronLeft,
        stackClassName: tw`items-start`,
        // cancels the 6px of blank lucide leaves beside the chevron
        iconClassName: tw`-ms-1.5`,
        cardClassName: undefined
    },
    next: {
        label: 'Next',
        icon: ChevronRight,
        stackClassName: tw`items-end`,
        iconClassName: tw`-me-1.5`,
        // the first page of the guide has no previous card to push this one across
        cardClassName: tw`sm:col-start-2`
    }
} as const;

type Direction = keyof typeof DIRECTIONS;

function Neighbour({ rel, page }: { rel: Direction; page: GuidePage }): ReactElement {
    const { label, icon, stackClassName, iconClassName, cardClassName } = DIRECTIONS[rel];
    const chevron = <Icon icon={icon} size={16} className={cn(iconClassName)} />;

    return (
        <Button asChild variant="outline" size="none" className={cn('w-full px-4 py-3', cardClassName)}>
            <Link href={page.href} rel={rel}>
                <span className={cn('flex w-full min-w-0 flex-col gap-0.5', stackClassName)}>
                    <span className={cn('flex items-center gap-0.5 text-xs text-(--text-faint)')}>
                        {rel === 'prev' ? chevron : null}
                        {page.tab === page.label ? label : `${label} · ${page.tab}`}
                        {rel === 'next' ? chevron : null}
                    </span>
                    <span className={cn('max-w-full truncate text-sm')}>{page.label}</span>
                </span>
            </Link>
        </Button>
    );
}

export function PageNav({ previous, next }: PageNeighbours): ReactElement | null {
    if (previous === undefined && next === undefined) return null;

    return (
        <nav
            aria-label="Previous and next page"
            className={cn('mt-12 grid gap-3 border-t border-(--border) pt-8 sm:grid-cols-2')}
        >
            {previous === undefined ? null : <Neighbour rel="prev" page={previous} />}
            {next === undefined ? null : <Neighbour rel="next" page={next} />}
        </nav>
    );
}
