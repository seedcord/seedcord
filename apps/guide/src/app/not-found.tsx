import { cn, MAIN_CONTENT_ID, NotFound as NotFoundBody } from '@seedcord/ui';
import Link from 'next/link';

import { GuideBar } from '#components/GuideNavbar';

import type { ReactNode } from 'react';

export default function NotFound(): ReactNode {
    return (
        <>
            <GuideBar />
            <main id={MAIN_CONTENT_ID} className={cn('flex justify-center px-(--page-gutter) pt-(--nav-h)')}>
                <div className={cn('py-20')}>
                    <NotFoundBody>
                        <Link href="/">Back to the guide</Link>
                    </NotFoundBody>
                </div>
            </main>
        </>
    );
}
