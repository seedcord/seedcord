import { formatRenderedSignaturePretty, type RenderedSignature, type ResolveHref } from '@seedcord/docs-engine';
import { CodeBlock, cn } from '@seedcord/ui';

import { CommentParagraphs } from '#components/docs/entity/comments/CommentParagraphs';
import { decorateProseLinks } from '#lib/docs/comments/renderers/decorateProseLinks';
import { opensInNewTab } from '#lib/docs/crossPackage';
import { sanitizeHtml } from '#lib/sanitizeHtml';
import { highlightSignatureToHtml, type CodeLink } from '#lib/shiki';

import type { CodeRepresentation } from '#lib/docs/types';
import type { ReactElement } from 'react';

const CURRENT_PACKAGE = 'seedcord';
const EMPTY_ANCHOR = /<a\b[^>]*>\s*<\/a>/g;

// marked renders a markdown `[label](href)` link as `<a href><code>label</code></a>`, so this mirrors that shape
const RAW_PROSE =
    '<p>Returns a <a href="/packages/seedcord/latest/classes/Seedcord"><code>Seedcord</code></a> instance ' +
    '(same package, in-tab, no icon), wraps <a href="/packages/utils/latest/functions/clamp"><code>clamp</code></a> ' +
    'from another package (new tab + icon), and mirrors the ' +
    '<a href="https://discord.js.org/docs">discord.js client</a> (external, new tab + icon).</p>';

// adversarial case, the function name `getClient` contains the substring Client. the real engine
// assigns the ref offset through a sentinel marker (pretty-formatter substituteRefs) so only the
// return-type token links. going through that real path catches the earlier `getClient` mislink
// that a faked offset would miss
const SIGNATURE: RenderedSignature = {
    name: [{ kind: 'text', text: 'getClient' }],
    parameters: [],
    returnType: { parts: [{ kind: 'ref', text: 'Client', ref: { name: 'Client', packageName: '@seedcord/utils' } }] }
};

const resolveClientHref: ResolveHref = (reference) =>
    reference.name === 'Client' ? '/packages/utils/latest/classes/Client' : null;

function Section({ title, children }: { title: string; children: ReactElement | ReactElement[] }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

async function buildSignature(): Promise<CodeRepresentation> {
    const { text, refs } = await formatRenderedSignaturePretty(SIGNATURE, resolveClientHref);
    // mirrors formatting.ts, exercising the same ref-to-link mapping the real formatter uses
    const links: CodeLink[] = refs.flatMap((ref) =>
        ref.href
            ? [
                  {
                      name: ref.name,
                      href: ref.href,
                      start: ref.start,
                      end: ref.end,
                      external: opensInNewTab(ref.href, CURRENT_PACKAGE)
                  }
              ]
            : []
    );
    const html = (await highlightSignatureToHtml(text, links)) ?? '';
    return { text, html: sanitizeHtml(html).replace(EMPTY_ANCHOR, '') };
}

async function CrossPkgLinkPage(): Promise<ReactElement> {
    const proseHtml = sanitizeHtml(decorateProseLinks(RAW_PROSE, CURRENT_PACKAGE));
    const representation = await buildSignature();

    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Cross-package links</h1>
                <p className={cn('text-subtle text-sm')}>
                    Current package: <code>seedcord</code>. Links that leave it (different package or external) open in
                    a new tab. The arrow indicator appears in prose only, never inside code blocks.
                </p>
            </header>
            <Section title="Prose (TSDoc comment text)">
                <CommentParagraphs paragraphs={[{ plain: '', html: proseHtml }]} />
            </Section>
            <Section title="Inside a signature (code block, no icon)">
                <CodeBlock representation={representation} label="getClient" />
            </Section>
        </div>
    );
}

export default CrossPkgLinkPage;
