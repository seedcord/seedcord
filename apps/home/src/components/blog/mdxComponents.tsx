import { cn, tw } from '@seedcord/ui';
import { AnchoredHeading } from '@seedcord/ui/AnchoredHeading';
import { readFenceElement } from '@seedcord/ui/fence';
import { isShellLanguage } from '@seedcord/ui/shiki';
import Image from 'next/image';

import { CodeCard } from '#components/code/CodeCard';
import { Code } from '#components/ui/Code';
import { SiteLink } from '#components/ui/SiteLink';
import { CODE_MARK_LIGHT } from '#lib/code/marks';

import type { HighlightLanguage } from '@seedcord/ui/shiki';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

const MEDIA = tw`rule blk-rind my-3`;

function captionFor(tag: string | undefined): string {
    if (tag === undefined) return 'text';
    return isShellLanguage(tag) ? 'terminal' : tag;
}

interface Fenced {
    code: string;
    lang: HighlightLanguage;
    title: string;
}

function readFence(children: ReactNode): Fenced | null {
    const fence = readFenceElement(children);
    if (!fence) return null;

    return { code: fence.code, lang: fence.language ?? 'txt', title: fence.title ?? captionFor(fence.tag) };
}

function Fence({ children }: { children?: ReactNode }): ReactNode {
    const fence = readFence(children);
    if (!fence) return <pre>{children}</pre>;

    return <CodeCard code={fence.code} filename={fence.title} lang={fence.lang} copyable className={cn(MEDIA)} />;
}

function PostLink({ href, children }: { href: string; children?: ReactNode }): ReactNode {
    return (
        <SiteLink
            href={href}
            className={cn(
                'font-semibold text-(--flesh-deep) underline decoration-2 underline-offset-2 hover:text-(--seed-dark)'
            )}
        >
            {children}
        </SiteLink>
    );
}

// remarkPostFiles in postFiles.ts sets src, width and height on every image. mdx passes them as strings
interface PostImageProps {
    src: string;
    alt: string;
    width: string;
    height: string;
}

function PostImage({ src, alt, width, height }: PostImageProps): ReactElement {
    return (
        <Image
            src={src}
            alt={alt}
            width={Number(width)}
            height={Number(height)}
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
    return function Heading(props: ComponentProps<'h2'>): ReactElement {
        return (
            <AnchoredHeading
                {...props}
                as={tag}
                wrapperClassName={cn('flex items-center gap-1', HEADINGS[tag].className)}
                className={cn('font-display scroll-mt-24 font-semibold tracking-tight text-(--seed-dark)')}
                anchorSize={HEADINGS[tag].anchorSize}
                anchorClassName={cn('text-(--seed-dark)/40 hover:text-(--flesh-deep)')}
            />
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
