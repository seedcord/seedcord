import { CodeBlock, cn, tw } from '@seedcord/ui';
import { highlightToHtml, isHighlightable } from '@seedcord/ui/shiki';

import type { MDXComponents } from 'mdx/types';
import type { BundledLanguage } from 'shiki';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

const LANGUAGE_PREFIX = 'language-';

interface FenceProps {
    children?: ReactNode;
}

const FRAME_WEIGHTS = {
    thin: tw`border`,
    regular: tw`border-2`,
    thick: tw`border-4`
} as const;

// auto margins do nothing without the block class below
const ALIGNMENTS = {
    left: tw`me-auto`,
    center: tw`mx-auto`,
    right: tw`ms-auto`
} as const;

interface ImageProps extends ComponentProps<'img'> {
    frame?: keyof typeof FRAME_WEIGHTS | false;
    align?: keyof typeof ALIGNMENTS;
}

// a typo would otherwise render as a padded box with no edge
function pick<T extends Record<string, string>>(options: T, key: keyof T, prop: string): string {
    const found = options[key];
    if (found === undefined)
        throw new Error(`${String(key)} is not a ${prop}. Write one of ${Object.keys(options).join(', ')}.`);

    return found;
}

function GuideImage({ alt, frame = 'regular', align = 'left', className, ...props }: ImageProps): ReactElement {
    return (
        // eslint-disable-next-line @next/next/no-img-element -- next/image requires width and height, both optional on ImageProps
        <img
            {...props}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn(
                'block h-auto max-w-full rounded-md',
                pick(ALIGNMENTS, align, 'align'),
                frame !== false &&
                    cn(pick(FRAME_WEIGHTS, frame, 'frame'), 'border-(--border) bg-(--surface-subtle) p-2'),
                className
            )}
        />
    );
}

// mdx renders a fence as <pre><code className="language-x">
function readFence(children: ReactNode): { code: string; lang: BundledLanguage } | null {
    if (typeof children !== 'object' || children === null || !('props' in children)) return null;

    const props = children.props as Record<string, unknown>;
    const code = props.children;
    if (typeof code !== 'string') return null;

    const className = typeof props.className === 'string' ? props.className : '';
    const named = className
        .split(/\s+/)
        .find((name) => name.startsWith(LANGUAGE_PREFIX))
        ?.slice(LANGUAGE_PREFIX.length);

    return { code: code.replace(/\n$/, ''), lang: named && isHighlightable(named) ? named : 'ts' };
}

async function Fence({ children }: FenceProps): Promise<ReactElement> {
    const fence = readFence(children);
    if (!fence) return <pre>{children}</pre>;

    const html = await highlightToHtml(fence.code, fence.lang);
    return <CodeBlock representation={{ text: fence.code, html }} />;
}

export const mdxComponents = {
    pre: Fence,
    h2: (props) => <h2 {...props} className={cn('font-display mt-6 text-2xl/snug font-semibold text-(--text)')} />,
    h3: (props) => <h3 {...props} className={cn('font-display mt-4 text-xl/snug font-semibold text-(--text)')} />,
    h4: (props) => <h4 {...props} className={cn('font-display mt-3 text-lg/snug font-semibold text-(--text)')} />,
    p: (props) => <p {...props} className={cn('text-base/relaxed text-(--text)')} />,
    a: (props) => <a {...props} className={cn('text-(--rind-deep) underline underline-offset-4')} />,
    strong: (props) => <strong {...props} className={cn('font-semibold')} />,
    ul: (props) => <ul {...props} className={cn('list-disc space-y-1 ps-6 text-base/relaxed text-(--text)')} />,
    ol: (props) => <ol {...props} className={cn('list-decimal space-y-1 ps-6 text-base/relaxed text-(--text)')} />,
    code: (props) => <code {...props} className={cn('rounded-sm bg-(--surface-moderate) px-1.5 py-0.5 text-sm')} />,
    blockquote: (props) => (
        <blockquote
            {...props}
            // the p mapping above sets its own color
            className={cn('flex flex-col gap-3 border-s-2 border-(--border) ps-4 [&>p]:text-(--text-muted)')}
        />
    ),
    hr: (props) => <hr {...props} className={cn('my-3 border-(--border)')} />,
    img: GuideImage,
    // a lowercase tag written as jsx in an mdx file skips this map
    Image: GuideImage
} satisfies MDXComponents;
