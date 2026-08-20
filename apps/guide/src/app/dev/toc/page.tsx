'use client';

import { SegmentedControl, cn } from '@seedcord/ui';
import { AnchorProvider, useActiveAnchors } from 'fumadocs-core/toc';
import { useState } from 'react';

import { TocBordered, TocSliding, TocTinted } from '#components/TableOfContents';

import { DEFAULT_SHAPE, MockArticle, SHAPES, tocOf } from './mock';

import type { ShapeKey } from './mock';
import type { TableOfContentsProps } from '#components/TableOfContents';
import type { CSSProperties, ReactElement } from 'react';

const VARIANTS = {
    bordered: TocBordered,
    sliding: TocSliding,
    tinted: TocTinted
} as const;

type VariantKey = keyof typeof VARIANTS;

const VARIANT_OPTIONS = [
    { value: 'bordered', label: 'Bordered' },
    { value: 'sliding', label: 'Sliding' },
    { value: 'tinted', label: 'Tinted' }
] as const satisfies readonly { value: VariantKey; label: string }[];

const SHAPE_OPTIONS = SHAPES.map((shape) => ({ value: shape.key, label: shape.label }));

// the guide's own bar measures 72 plus a 47 tab row
const MOCK_SHELL_STYLE = { '--nav-h': '120px' } as CSSProperties;

function LiveToc({ variant, items }: { variant: VariantKey } & Pick<TableOfContentsProps, 'items'>): ReactElement {
    const activeIds = useActiveAnchors();
    const Toc = VARIANTS[variant];

    return (
        <Toc
            items={items}
            activeIds={activeIds}
            className={cn('top-(--nav-h) hidden max-h-[calc(100dvh-var(--nav-h))] py-10 lg:block')}
        />
    );
}

function SidebarStandIn(): ReactElement {
    return (
        <div
            aria-hidden
            className={cn(
                'sticky top-(--nav-h) hidden h-[calc(100dvh-var(--nav-h))] w-64 shrink-0 py-10 lg:block',
                'text-xs text-(--text-faint)'
            )}
        >
            <div className={cn('h-full rounded-md border border-dashed border-(--border) p-3')}>sidebar, 256px</div>
        </div>
    );
}

function TocPage(): ReactElement {
    const [variant, setVariant] = useState<VariantKey>('bordered');
    const [shapeKey, setShapeKey] = useState<ShapeKey>(DEFAULT_SHAPE.key);
    const shape = SHAPES.find((candidate) => candidate.key === shapeKey) ?? DEFAULT_SHAPE;
    const items = tocOf(shape);

    return (
        <div style={MOCK_SHELL_STYLE}>
            <header
                className={cn(
                    'sticky top-0 z-50 h-(--nav-h) border-b border-(--border) bg-(--bg-navbar) backdrop-blur'
                )}
            >
                <div
                    className={cn(
                        'mx-auto flex size-full max-w-(--shell-max) flex-wrap items-center gap-4 px-4 md:px-6'
                    )}
                >
                    <span className={cn('text-xs font-semibold tracking-widest text-(--text-faint) uppercase')}>
                        navbar, 1280
                    </span>
                    <SegmentedControl
                        options={VARIANT_OPTIONS}
                        value={variant}
                        onChange={setVariant}
                        size="sm"
                        aria-label="Rail variant"
                    />
                    <SegmentedControl
                        options={SHAPE_OPTIONS}
                        value={shapeKey}
                        onChange={setShapeKey}
                        size="sm"
                        aria-label="Page shape"
                    />
                </div>
            </header>

            <AnchorProvider toc={items}>
                <div className={cn('mx-auto flex w-full max-w-(--content-max) gap-10 px-4 md:px-6')}>
                    <SidebarStandIn />
                    <main className={cn('min-w-0 flex-1 py-10')}>
                        <MockArticle shape={shape} />
                    </main>
                    <LiveToc variant={variant} items={items} />
                </div>
            </AnchorProvider>
        </div>
    );
}

export default TocPage;
