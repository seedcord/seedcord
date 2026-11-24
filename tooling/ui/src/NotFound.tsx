import { cn } from 'cn';

import { PosterButton } from './PosterButton';

import type { ReactElement } from 'react';

interface NotFoundProps {
    // a link back to the start of the site
    children: ReactElement;
}

export function NotFound({ children }: NotFoundProps): ReactElement {
    return (
        <div className={cn('flex flex-col items-center text-center text-(--text)')}>
            <p
                className={cn(
                    'font-display text-[clamp(7rem,22vw,14rem)] leading-[0.8] font-semibold tracking-tighter text-(--poster-red)'
                )}
            >
                404
            </p>
            <h1
                className={cn(
                    'font-display mt-6 text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[0.95] font-semibold tracking-tight'
                )}
            >
                This route isn&apos;t registered.
            </h1>
            <p className={cn('mt-5 max-w-md text-lg/snug font-medium text-(--text-muted)')}>
                The page you asked for doesn&apos;t exist. Head back and pick one that does.
            </p>
            <PosterButton wrapperClassName={cn('mt-8')} className={cn('min-w-64')}>
                {children}
            </PosterButton>
        </div>
    );
}
