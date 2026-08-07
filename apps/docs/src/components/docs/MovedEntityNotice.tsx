'use client';

import { Button, Card, Icon, cn, tw } from '@seedcord/ui';
import { Signpost, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import type { ReactElement } from 'react';

const noticeClassName = tw`shadow-soft inline-flex max-w-full items-center gap-2.5 py-2 pr-2 pl-3`;

// the entity route redirects a dead cross-package link here with `?moved=<symbol>` (see
// app/(docs)/entity/route.ts). the package index page is force-static, so the symbol is read
// client-side. useSearchParams hydrates against the live URL
export function MovedEntityNotice({ packageLabel }: { packageLabel: string }): ReactElement | null {
    const moved = useSearchParams().get('moved');
    const [dismissed, setDismissed] = useState(false);

    if (!moved || dismissed) return null;

    return (
        <div className={cn('flex justify-center')}>
            <Card variant="flat" size="none" role="status" className={cn(noticeClassName)}>
                <span className={cn('shrink-0 text-(--accent-b)')}>
                    <Icon icon={Signpost} size={16} />
                </span>
                <p className={cn('text-subtle min-w-0 text-sm')}>
                    <code className={cn('font-medium text-(--text)')}>{moved}</code> may have moved in a newer version
                    of <span className={cn('font-medium text-(--text)')}>{packageLabel}</span>
                </p>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Dismiss notice"
                    onClick={() => {
                        setDismissed(true);
                    }}
                    className={cn('size-7 shrink-0')}
                >
                    <Icon icon={X} size={15} />
                </Button>
            </Card>
        </div>
    );
}
