import { CodeBlock, cn } from '@seedcord/ui';
import { highlightToHtml, isHighlightable } from '@seedcord/ui/shiki';

import type { MDXComponents } from 'mdx/types';
import type { BundledLanguage } from 'shiki';
import type { ReactElement, ReactNode } from 'react';

const LANGUAGE_PREFIX = 'language-';

interface FenceProps {
    children?: ReactNode;
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

    // an unloaded grammar falls back, since the highlighter carries six
    return { code: code.replace(/\n$/, ''), lang: named && isHighlightable(named) ? named : 'ts' };
}

async function Fence({ children }: FenceProps): Promise<ReactElement> {
    const fence = readFence(children);
    if (!fence) return <pre>{children}</pre>;

    const html = await highlightToHtml(fence.code, fence.lang);
    return <CodeBlock representation={{ text: fence.code, html }} />;
}

export const mdxComponents: MDXComponents = {
    pre: Fence,
    h2: (props) => <h2 {...props} className={cn('font-display mt-6 text-2xl/snug font-semibold text-(--text)')} />,
    h3: (props) => <h3 {...props} className={cn('font-display mt-4 text-xl/snug font-semibold text-(--text)')} />,
    p: (props) => <p {...props} className={cn('text-base/relaxed text-(--text)')} />,
    a: (props) => <a {...props} className={cn('text-(--rind-deep) underline underline-offset-4')} />,
    ul: (props) => <ul {...props} className={cn('list-disc space-y-1 ps-6 text-base/relaxed text-(--text)')} />,
    ol: (props) => <ol {...props} className={cn('list-decimal space-y-1 ps-6 text-base/relaxed text-(--text)')} />,
    code: (props) => <code {...props} className={cn('rounded-sm bg-(--surface-moderate) px-1.5 py-0.5 text-sm')} />
};
