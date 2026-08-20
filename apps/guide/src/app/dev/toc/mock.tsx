import { CodeBlock, cn } from '@seedcord/ui';

import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactElement } from 'react';

export interface MockHeading {
    id: string;
    text: string;
    depth: TOCItemType['depth'];
    paragraphs: number;
    codeLines?: number;
}

export interface MockShape {
    key: string;
    label: string;
    title: string;
    description: string;
    headings: readonly MockHeading[];
}

const TEMPLATE_HEADINGS: readonly MockHeading[] = [
    { id: 'do-this', text: 'Do this', depth: 2, paragraphs: 2, codeLines: 5 },
    { id: 'how-it-works', text: 'How it works', depth: 2, paragraphs: 4 },
    { id: 'when-it-breaks', text: 'When it breaks', depth: 2, paragraphs: 1 },
    {
        id: 'cannot-read-properties-of-undefined',
        text: 'Cannot read properties of undefined',
        depth: 3,
        paragraphs: 2,
        codeLines: 3
    },
    { id: 'missing-required-option-name', text: "Missing required option 'name'", depth: 3, paragraphs: 1 },
    { id: 'route-already-registered', text: 'Route already registered', depth: 3, paragraphs: 3 },
    { id: 'on-http', text: 'On http', depth: 2, paragraphs: 1 },
    { id: 'related', text: 'Related', depth: 2, paragraphs: 1 }
];

const LONG_HEADINGS: readonly MockHeading[] = [
    { id: 'install-the-cli', text: 'Install the CLI', depth: 2, paragraphs: 1, codeLines: 3 },
    { id: 'the-dev-loop', text: 'The dev loop', depth: 2, paragraphs: 2 },
    { id: 'watching-for-changes', text: 'Watching for changes', depth: 3, paragraphs: 1 },
    { id: 'the-dev-tunnel', text: 'The dev tunnel', depth: 3, paragraphs: 5, codeLines: 6 },
    { id: 'codegen', text: 'Codegen', depth: 2, paragraphs: 2 },
    { id: 'what-it-reads', text: 'What it reads', depth: 3, paragraphs: 1 },
    { id: 'what-it-writes', text: 'What it writes', depth: 3, paragraphs: 4, codeLines: 9 },
    { id: 'logging', text: 'Logging', depth: 2, paragraphs: 3 },
    { id: 'channels', text: 'Channels', depth: 3, paragraphs: 1 },
    { id: 'sinks', text: 'Sinks', depth: 3, paragraphs: 6 },
    { id: 'going-to-production', text: 'Going to production', depth: 2, paragraphs: 2, codeLines: 4 },
    { id: 'the-server-build', text: 'The server build', depth: 3, paragraphs: 1 },
    { id: 'the-edge-build', text: 'The edge build', depth: 3, paragraphs: 7 },
    {
        id: 'a-command-that-never-shows-up-in-discord',
        text: 'A command that never shows up in Discord',
        depth: 3,
        paragraphs: 1
    },
    { id: 'on-http-long', text: 'On http', depth: 2, paragraphs: 2 },
    { id: 'related-long', text: 'Related', depth: 2, paragraphs: 1 }
];

const SHORT_HEADINGS: readonly MockHeading[] = [
    { id: 'do-this-short', text: 'Do this', depth: 2, paragraphs: 4, codeLines: 6 },
    { id: 'related-short', text: 'Related', depth: 2, paragraphs: 1 }
];

const TEMPLATE_SHAPE = {
    key: 'template',
    label: 'Page template',
    title: 'Options that type themselves',
    description:
        'You declare a command options once. Codegen reads that declaration and types this.options, so a required option comes back non-null and a name you never declared fails to compile.',
    headings: TEMPLATE_HEADINGS
};

const LONG_SHAPE = {
    key: 'long',
    label: 'Long page',
    title: 'The dev loop end to end',
    description:
        'Sixteen headings and sections running from one paragraph to seven. Four carry a code block. This is where the rail decides what to do once its own list runs past the screen.',
    headings: LONG_HEADINGS
};

const SHORT_SHAPE = {
    key: 'short',
    label: 'Two headings',
    title: 'Reading an option',
    description: 'Two headings, which is the case where a rail may be worth skipping entirely.',
    headings: SHORT_HEADINGS
};

export const SHAPES = [TEMPLATE_SHAPE, LONG_SHAPE, SHORT_SHAPE] as const satisfies readonly MockShape[];

export type ShapeKey = (typeof SHAPES)[number]['key'];

export const DEFAULT_SHAPE = TEMPLATE_SHAPE;

export function tocOf(shape: MockShape): TOCItemType[] {
    return shape.headings.map((heading) => ({ title: heading.text, url: `#${heading.id}`, depth: heading.depth }));
}

const FILLER = [
    'Every getter narrows from your own declaration. A required option returns a value, and an optional one returns a union with null.',
    'It runs once per start.',
    'The generated registry only knows this command own options, so a typo stops at the compiler instead of at a user. That is the whole reason the declaration and the getter share a source. Rename an option and every call site that reads it stops compiling on the next check, which is a cheaper place to find out than a user hitting the command in production and getting nothing back.',
    'Both transports read options through the same generated registry, so a handler moved between them keeps its types.',
    'Run it again after any edit.',
    'Codegen reads the commands directory on every dev start and writes one declaration file. Nothing else in the build touches it, so a stale file survives a failed run and the types drift until the next clean pass.',
    'The default covers most bots.',
    'A handler that throws before its first reply produces a fault, and the bus carries it to whatever you subscribed. Discord gets a refusal either way, so the user never waits on a stack trace.'
];

const CODE = [
    "import { SlashHandler, SlashRoute } from '@seedcord/gateway';",
    '',
    "@SlashRoute('maintenance')",
    "export class Maintenance extends SlashHandler<'maintenance'> {",
    '    public async execute(): Promise<void> {',
    "        const notify = this.options.getUser('notify');",
    '',
    '        await this.reply.send({ content: `paused by ${notify}` });',
    '    }'
];

function Section({ heading, index }: { heading: MockHeading; index: number }): ReactElement {
    const Tag = heading.depth === 2 ? 'h2' : 'h3';
    const size = heading.depth === 2 ? 'mt-10 text-2xl/snug' : 'mt-6 text-xl/snug';
    const paragraphs = Array.from(
        { length: heading.paragraphs },
        (_, offset) => FILLER[(index + offset) % FILLER.length]
    );

    return (
        <section>
            <Tag id={heading.id} className={cn('font-display font-semibold text-(--text)', size)}>
                {heading.text}
            </Tag>
            {paragraphs.map((text, offset) => (
                <p key={`${heading.id}-${offset}`} className={cn('mt-3 text-base/relaxed text-(--text)')}>
                    {text}
                </p>
            ))}
            {heading.codeLines === undefined ? null : (
                <div className={cn('mt-4')}>
                    <CodeBlock
                        label="src/handlers/Maintenance.ts"
                        representation={{ text: CODE.slice(0, heading.codeLines).join('\n'), html: null }}
                    />
                </div>
            )}
        </section>
    );
}

export function MockArticle({ shape }: { shape: MockShape }): ReactElement {
    return (
        <article>
            <h1 className={cn('font-display text-4xl/tight font-semibold text-(--text)')}>{shape.title}</h1>
            <p className={cn('mt-3 text-lg/relaxed text-(--text-muted)')}>{shape.description}</p>
            {shape.headings.map((heading, index) => (
                <Section key={heading.id} heading={heading} index={index} />
            ))}
        </article>
    );
}
