import { Button, Card, cn } from '@seedcord/ui';
import Image from 'next/image';
import Link from 'next/link';

import type { ReactElement } from 'react';

const GUIDE_URL = 'https://github.com/seedcord/seedcord-guide';

function Home(): ReactElement {
    return (
        <main id="main-content" className={cn('bg-(--bg-dim)')}>
            <div className={cn('mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-16 md:px-6 lg:py-24')}>
                <section className={cn('flex flex-wrap items-start justify-start gap-12 text-left lg:justify-between')}>
                    <div className={cn('flex max-w-xl min-w-0 flex-1 flex-col items-start gap-6')}>
                        <h1
                            className={cn(
                                'text-4xl font-semibold tracking-tight text-(--text) sm:text-5xl lg:text-6xl'
                            )}
                        >
                            The only Discord bot framework you&apos;ll ever need.
                        </h1>
                        <p className={cn('text-subtle text-lg/8')}>
                            Seedcord is an opinionated Discord bot framework built on top of Discord.js. You handle the
                            logic, it handles the rest.
                        </p>
                        <div className={cn('flex flex-row flex-wrap items-center gap-3')}>
                            <Button asChild variant="primary" size="lg">
                                <Link href="/docs">View documentation</Link>
                            </Button>
                            <Button asChild variant="secondary" size="lg">
                                <Link href={GUIDE_URL} target="_blank" rel="noreferrer">
                                    Read the guide
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <div className={cn('relative hidden items-center justify-center lg:flex lg:max-w-md lg:flex-1')}>
                        <Card
                            size="none"
                            className={cn(
                                'relative flex aspect-square w-32 items-center justify-center overflow-hidden p-4 sm:w-40 md:w-52 lg:w-64'
                            )}
                        >
                            <Image
                                src="/logo.svg"
                                alt="Seedcord logo"
                                width={240}
                                height={240}
                                priority
                                className={cn('h-auto w-full')}
                            />
                            <div
                                className={cn('pointer-events-none absolute inset-0 rounded-lg border border-white/10')}
                            />
                        </Card>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default Home;
