'use client';

import { cn, Icon, NpmIcon, PosterButton } from '@seedcord/ui';
import { useEffect, useState } from 'react';

import { SiteLink } from '#components/ui/SiteLink';
import { NPM_URL } from '#lib/site';

import type { ReactNode } from 'react';

// the workspace version is newer than the registry's during changesets pre-mode
const LATEST_API = 'https://registry.npmjs.org/seedcord/latest';

export function NpmVersion(): ReactNode {
    const [version, setVersion] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        void fetch(LATEST_API, { signal: controller.signal })
            .then(async (res) => (res.ok ? ((await res.json()) as { version?: string }) : null))
            .then((data) => {
                if (typeof data?.version === 'string') setVersion(data.version);
            })
            .catch(() => null);
        return () => controller.abort();
    }, []);

    if (version === null) return null;
    return (
        <PosterButton variant="ink" className={cn('group whitespace-nowrap')}>
            <SiteLink href={NPM_URL} aria-label={`seedcord v${version} on npm`}>
                <Icon icon={NpmIcon} size={20} className={cn('text-(--flesh) group-hover:text-(--pith) md:size-4')} />
                <span className={cn('sr-only md:not-sr-only')}>v{version}</span>
            </SiteLink>
        </PosterButton>
    );
}
