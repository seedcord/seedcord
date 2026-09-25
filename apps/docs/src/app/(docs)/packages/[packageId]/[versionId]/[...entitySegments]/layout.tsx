import { notFound } from 'next/navigation';

import { resolveEntity } from '#lib/docs/resolveEntity';

import type { PageParams } from '#lib/docs/pageContext';
import type { ReactNode } from 'react';

// next streams loading.tsx with a 200 before the page runs
async function EntityLayout({
    children,
    params
}: {
    children: ReactNode;
    params: Promise<PageParams>;
}): Promise<ReactNode> {
    if (!(await resolveEntity(await params))) notFound();
    return children;
}

export default EntityLayout;
