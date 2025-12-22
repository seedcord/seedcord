import Image from 'next/image';
import Link from 'next/link';

import type { ReactElement } from 'react';

const GUIDE_URL = 'https://github.com/materwelonDhruv/seedcord-guide';

function Home(): ReactElement {
    return (
        <main id="main-content" className="bg-(--bg-dim)">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-16 md:px-6 lg:py-24">
                <section className="flex flex-wrap items-start justify-start gap-12 text-left lg:justify-between">
                    <div className="flex max-w-xl min-w-0 flex-1 flex-col items-start gap-6">
                        <h1 className="text-4xl font-black tracking-tight text-(--text) sm:text-5xl lg:text-6xl">
                            The only Discord bot framework you&apos;ll ever need.
                        </h1>
                        <p className="text-subtle text-lg leading-8">
                            Seedcord is an opinionated Discord bot framework built on top of Discord.js. You handle the
                            logic, it handles the rest.
                        </p>
                        <div className="flex flex-row flex-wrap items-center gap-3">
                            <Link
                                href="/docs"
                                className="shadow-soft inline-flex items-center justify-center rounded-2xl bg-(--accent-a) px-6 py-3 text-sm font-semibold text-white transition hover:bg-(--accent-a-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-a)"
                            >
                                View documentation
                            </Link>
                            <Link
                                href={GUIDE_URL}
                                target="_blank"
                                rel="noreferrer"
                                className="shadow-soft inline-flex items-center justify-center rounded-2xl bg-(--accent-b) px-6 py-3 text-sm font-semibold text-black transition hover:bg-(--accent-b-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-b)"
                            >
                                Read the guide
                            </Link>
                        </div>
                    </div>
                    <div className="relative hidden items-center justify-center lg:flex lg:max-w-md lg:flex-1">
                        <div className="bg-surface-96 shadow-soft-token relative flex aspect-square w-32 items-center justify-center overflow-hidden rounded-3xl border border-(--border)/80 p-4 sm:w-40 md:w-52 lg:w-64">
                            <Image
                                src="/logo.svg"
                                alt="Seedcord logo"
                                width={240}
                                height={240}
                                priority
                                className="h-auto w-full"
                            />
                            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default Home;
