import { cn, MAIN_CONTENT_ID, NotFound as NotFoundBody, PosterSection } from '@seedcord/ui';
import Link from 'next/link';

import { Footer } from '#components/home/Footer';
import { Nav } from '#components/home/Nav';

import type { ReactNode } from 'react';

export default function NotFound(): ReactNode {
    return (
        <>
            <Nav />
            <main id={MAIN_CONTENT_ID}>
                <PosterSection ground="pith" className={cn('flex justify-center')}>
                    <NotFoundBody>
                        <Link href="/">Back to home</Link>
                    </NotFoundBody>
                </PosterSection>
            </main>
            <Footer />
        </>
    );
}
