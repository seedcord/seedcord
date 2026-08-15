import { cn } from '@seedcord/ui';
import { Materwelon } from '@seedcord/ui/Materwelon';

import { Footer } from '#components/home/Footer';
import { Nav } from '#components/home/Nav';
import { PosterButton } from '#components/ui/PosterButton';

import type { ReactNode } from 'react';

export default function NotFound(): ReactNode {
    return (
        <>
            <Nav />
            <main
                id="main-content"
                className={cn(
                    'flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-(--pith) px-5 py-20 text-center'
                )}
            >
                <Materwelon className={cn('drop-shadow-mark size-20')} />
                <p className={cn('font-mono-code text-sm font-semibold text-(--vine-deep)')}>error 404</p>
                <h1
                    className={cn(
                        'font-display text-[clamp(3rem,9vw,6rem)] leading-[0.92] font-semibold tracking-tight text-(--seed-dark)'
                    )}
                >
                    This route is <span className={cn('text-(--flesh-deep)')}>not registered</span>.
                </h1>
                <p className={cn('max-w-md text-lg/snug font-medium text-(--seed-dark)/85')}>
                    The page you asked for does not exist. Head back and pick one that does.
                </p>
                <PosterButton href="/" variant="solid" className={cn('font-display px-7 py-3 text-lg')}>
                    Back to home
                </PosterButton>
            </main>
            <Footer />
        </>
    );
}
