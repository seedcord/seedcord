import { Card, CodeBlock, CopyAnchorButton, cn, tw } from '@seedcord/ui';
import { highlightInlineToHtml, isHighlightable } from '@seedcord/ui/shiki';

import { Callout } from '#components/Callout';
import { HoverHint } from '#components/HoverHint';
import { Shell } from '#components/Shell';
import { LINK, Ref } from '#components/Ref';
import { TypeHover } from '#components/TypeHover';
import { FENCE_ATTR, LANGUAGE_PREFIX } from '#lib/rehypeFenceMeta';
import { twoslashBlock } from '#lib/twoslash';

import type { FenceMode } from '#lib/twoslash';
import type { MDXComponents } from 'mdx/types';
import type { BundledLanguage } from 'shiki';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

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

function GuideImage({ alt, frame = false, align = 'left', className, ...props }: ImageProps): ReactElement {
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

function GuideTable({ children, ...props }: ComponentProps<'table'>): ReactElement {
    return (
        <Card as="div" size="none" data-table className={cn('overflow-hidden')}>
            <div className={cn('nice-scroll overflow-x-auto')}>
                <table {...props} className={cn('w-full border-collapse text-left text-sm')}>
                    {children}
                </table>
            </div>
        </Card>
    );
}

interface Fenced {
    code: string;
    lang: BundledLanguage;
    title: string | undefined;
    output: boolean;
    mode: FenceMode;
}

function modeOf(props: Record<string, unknown>): FenceMode {
    if (!(FENCE_ATTR.twoslash in props)) return 'off';

    return FENCE_ATTR.hovers in props ? 'hovers' : 'check';
}

// mdx renders a fence as <pre><code className="language-x">
function readFence(children: ReactNode): Fenced | null {
    if (typeof children !== 'object' || children === null || !('props' in children)) return null;

    const props = children.props as Record<string, unknown>;
    const code = props.children;
    if (typeof code !== 'string') return null;

    const className = typeof props.className === 'string' ? props.className : '';
    const named = className
        .split(/\s+/)
        .find((name) => name.startsWith(LANGUAGE_PREFIX))
        ?.slice(LANGUAGE_PREFIX.length);
    const title = props[FENCE_ATTR.title];

    return {
        code: code.replace(/\n$/, ''),
        lang: named && isHighlightable(named) ? named : 'ts',
        title: typeof title === 'string' ? title : undefined,
        output: FENCE_ATTR.output in props,
        mode: modeOf(props)
    };
}

const HEADING_SIZES = {
    h2: tw`mt-6 text-2xl/snug`,
    h3: tw`mt-4 text-xl/snug`,
    h4: tw`mt-3 text-lg/snug`
} as const;

const ANCHOR = tw`ms-1 shrink-0 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-has-focus-visible:opacity-100 md:data-[copied=true]:opacity-100`;

function headingFor(tag: keyof typeof HEADING_SIZES): (props: ComponentProps<'h2'>) => ReactElement {
    // the button stays a sibling, since a labelled control inside a heading joins the heading's own name
    return function Heading({ id, children, ...props }: ComponentProps<'h2'>): ReactElement {
        const Tag = tag;

        return (
            <div className={cn('group flex items-center', HEADING_SIZES[tag])}>
                <Tag {...props} id={id} className={cn('font-display font-semibold text-(--text)')}>
                    {children}
                </Tag>
                {id === undefined ? null : (
                    <CopyAnchorButton
                        anchorId={id}
                        label={typeof children === 'string' ? children : id}
                        className={cn(ANCHOR)}
                    />
                )}
            </div>
        );
    };
}

async function InlineCode({ children }: FenceProps): Promise<ReactElement> {
    const html = typeof children === 'string' ? await highlightInlineToHtml(children) : null;
    if (!html) return <code className={cn('shiki-inline')}>{children}</code>;

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

async function Fence({ children }: FenceProps): Promise<ReactElement> {
    const fence = readFence(children);
    if (!fence) return <pre>{children}</pre>;

    const representation = await twoslashBlock(fence.code, fence.lang, fence.mode);

    const hoverable = fence.mode === 'hovers';
    const block = (
        <CodeBlock
            representation={representation}
            label={fence.title}
            copyValue={fence.output ? null : undefined}
            actions={hoverable ? <HoverHint /> : undefined}
        />
    );

    return hoverable ? <TypeHover>{block}</TypeHover> : block;
}

const OFF_SITE = /^[a-z]+:/i;

function GuideLink({ href, ...props }: ComponentProps<'a'>): ReactElement {
    const offSite = href !== undefined && OFF_SITE.test(href);

    return (
        <a
            {...props}
            href={href}
            {...(offSite && { target: '_blank', rel: 'noreferrer noopener' })}
            className={cn(LINK)}
        />
    );
}

export const mdxComponents = {
    pre: Fence,
    h2: headingFor('h2'),
    h3: headingFor('h3'),
    h4: headingFor('h4'),
    p: (props) => <p {...props} className={cn('text-base/relaxed text-(--text)')} />,
    a: GuideLink,
    strong: (props) => <strong {...props} className={cn('font-semibold')} />,
    ul: (props) => <ul {...props} className={cn('list-disc space-y-1 ps-6 text-base/relaxed text-(--text)')} />,
    ol: (props) => <ol {...props} className={cn('list-decimal space-y-1 ps-6 text-base/relaxed text-(--text)')} />,
    code: InlineCode,
    blockquote: (props) => (
        <blockquote
            {...props}
            // the p mapping above sets its own color
            className={cn('flex flex-col gap-3 border-s-2 border-(--border) ps-4 [&>p]:text-(--text-muted)')}
        />
    ),
    hr: (props) => <hr {...props} className={cn('my-3 border-(--border)')} />,
    table: GuideTable,
    thead: (props) => <thead {...props} className={cn('border-b border-(--border) bg-(--surface-moderate)')} />,
    tbody: (props) => <tbody {...props} className={cn('divide-y divide-(--border)/70')} />,
    th: (props) => <th {...props} className={cn('px-3 py-2 align-top font-semibold text-(--text)')} />,
    td: (props) => <td {...props} className={cn('px-3 py-2 align-top text-(--text)')} />,
    img: GuideImage,
    // a lowercase tag written as jsx in an mdx file skips this map
    Image: GuideImage,
    Callout,
    Shell,
    Ref
} satisfies MDXComponents;
