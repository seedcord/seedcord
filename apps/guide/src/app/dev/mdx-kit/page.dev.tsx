import { cn } from '@seedcord/ui';
import { notFound } from 'next/navigation';

import { devSource } from '#lib/devSource';
import { mdxComponents } from '#lib/mdxComponents';

import type { ReactNode } from 'react';

async function MdxKit(): Promise<ReactNode> {
    const page = devSource.getPage(['mdx-kit']);
    if (!page) notFound();

    const MDX = page.data.body;

    return (
        <article className={cn('mx-auto w-full max-w-4xl px-6 py-10')}>
            <h1 className={cn('font-display text-4xl/tight font-semibold text-(--text)')}>{page.data.title}</h1>
            <p className={cn('mt-3 text-lg/relaxed text-(--text-muted)')}>{page.data.description}</p>
            <div className={cn('mt-10 flex flex-col gap-5')}>
                <MDX components={mdxComponents} />
            </div>
        </article>
    );
}

export default MdxKit;
