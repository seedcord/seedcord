import { cn, CopyAnchorButton, tw } from '@seedcord/ui';
import { isHighlightable } from '@seedcord/ui/shiki';
import Image from 'next/image';
import Link from 'next/link';

import { CodeCard } from '#components/code/CodeCard';
import { Code } from '#components/ui/Code';
import { linkTarget } from '#components/ui/linkTarget';
import { FENCE_TITLE } from '#lib/blog/fenceTitle';
import { CODE_MARK_LIGHT } from '#lib/code/marks';

import type { HighlightLanguage } from '@seedcord/ui/shiki';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

const LANGUAGE_PREFIX = 'language-';
const SHELLS = new Set(['bash', 'sh', 'shell', 'zsh']);

const MEDIA = tw`rule blk-rind my-3`;

function captionFor(lang: string | undefined): string {
    if (lang === undefined) return 'text';
    return SHELLS.has(lang) ? 'terminal' : lang;
}

interface Fenced {
    code: string;
    lang: HighlightLanguage;
    title: string;
}

// mdx renders a fence as <pre><code className="language-x">
function readFence(children: ReactNode): Fenced | null {
    if (typeof children !== 'object' || children === null || !('props' in children)) return null;

    const props = children.props as Record<string, unknown>;
    if (typeof props.children !== 'string') return null;

    const className = typeof props.className === 'string' ? props.className : '';
    const named = className
        .split(/\s+/)
        .find((name) => name.startsWith(LANGUAGE_PREFIX))
        ?.slice(LANGUAGE_PREFIX.length);
    const title = props[FENCE_TITLE];

    return {
        code: props.children,
        lang: named && isHighlightable(named) ? named : 'txt',
        title: typeof title === 'string' ? title : captionFor(named)
    };
}

function Fence({ children }: { children?: ReactNode }): ReactNode {
    const fence = readFence(children);
    if (!fence) return <pre>{children}</pre>;

    return <CodeCard code={fence.code} filename={fence.title} lang={fence.lang} copyable className={cn(MEDIA)} />;
}

function PostLink({ href = '', children }: Pick<ComponentProps<'a'>, 'href' | 'children'>): ReactNode {
    return (
        <Link
            href={href}
            {...linkTarget(href)}
            className={cn(
                'font-semibold text-(--flesh-deep) underline decoration-2 underline-offset-2 hover:text-(--seed-dark)'
            )}
        >
            {children}
        </Link>
    );
}

// remarkPostImages in postImages.ts sets all four on every image
interface PostImageProps {
    src: string;
    alt: string;
    width: number | string;
    height: number | string;
}

function PostImage({ src, alt, width, height }: PostImageProps): ReactElement {
    return (
        <Image
            src={src}
            alt={alt}
            width={Number(width)}
            height={Number(height)}
            loading="lazy"
            className={cn(MEDIA, 'h-auto w-full rounded-sm bg-(--seed-dark)')}
        />
    );
}

const HEADINGS = {
    h2: { className: tw`mt-6 text-3xl`, anchorSize: 20 },
    h3: { className: tw`mt-3 text-2xl`, anchorSize: 17 },
    h4: { className: tw`mt-2 text-xl`, anchorSize: 15 }
} as const;

function headingFor(tag: keyof typeof HEADINGS): (props: ComponentProps<'h2'>) => ReactElement {
    // a labelled control inside a heading becomes part of the heading's accessible name
    return function Heading({ id, children, ...props }: ComponentProps<'h2'>): ReactElement {
        const Tag = tag;

        return (
            <div className={cn('group flex items-center gap-1', HEADINGS[tag].className)}>
                <Tag
                    {...props}
                    id={id}
                    className={cn('font-display scroll-mt-24 font-semibold tracking-tight text-(--seed-dark)')}
                >
                    {children}
                </Tag>
                {id === undefined ? null : (
                    <CopyAnchorButton
                        anchorId={id}
                        label={typeof children === 'string' ? children : id}
                        iconSize={HEADINGS[tag].anchorSize}
                        className={cn(
                            'shrink-0 text-(--seed-dark)/40 transition-opacity hover:text-(--flesh-deep) md:opacity-0 md:group-hover:opacity-100 md:group-has-focus-visible:opacity-100 md:data-[copied=true]:opacity-100'
                        )}
                    />
                )}
            </div>
        );
    };
}

const PROSE = tw`text-lg/relaxed text-(--seed-dark)/85`;

export const mdxComponents = {
    pre: Fence,
    code: ({ children }) => <Code className={cn(CODE_MARK_LIGHT)}>{children}</Code>,
    h2: headingFor('h2'),
    h3: headingFor('h3'),
    h4: headingFor('h4'),
    p: (props) => <p {...props} className={cn(PROSE)} />,
    a: PostLink,
    strong: (props) => <strong {...props} className={cn('font-semibold text-(--seed-dark)')} />,
    ul: (props) => <ul {...props} className={cn(PROSE, 'list-disc space-y-1 ps-6')} />,
    ol: (props) => <ol {...props} className={cn(PROSE, 'list-decimal space-y-1 ps-6')} />,
    blockquote: (props) => (
        <blockquote
            {...props}
            className={cn('border-s-[3px] border-(--flesh-deep) ps-5 [&>p]:text-(--seed-dark)/70')}
        />
    ),
    hr: (props) => <hr {...props} className={cn('my-4 border-t-[3px] border-(--seed-dark)/15')} />,
    table: (props) => (
        <div className={cn(MEDIA, 'overflow-x-auto rounded-sm')}>
            <table {...props} className={cn('w-full border-collapse text-left text-base')} />
        </div>
    ),
    thead: (props) => <thead {...props} className={cn('bg-(--seed-dark) text-(--pith)')} />,
    tbody: (props) => <tbody {...props} className={cn('divide-y-[1.5px] divide-(--seed-dark)/15')} />,
    th: (props) => <th {...props} className={cn('px-4 py-2 text-sm font-semibold')} />,
    td: (props) => <td {...props} className={cn('px-4 py-2 align-top')} />,
    img: PostImage
} satisfies MDXComponents;
