import { Badge, Card, CardBody, CardHeader, CardTitle, CodeBlock, cn } from '@seedcord/ui';

import { getToneConfig } from '@lib/tonePresentation';

import { renderSeedcord } from '../code-theme/compareHighlight';

import { BackgroundPicker } from './BackgroundPicker';

import type { EntityTone } from '@seedcord/docs-engine/client';
import type { ReactElement } from 'react';

const SNIPPET = `@Gated(GuildOnly())
@SlashRoute('library/search')
export class SearchHandler extends SlashHandler<'library/search'> {
    // resolves the query and replies
    public async execute(): Promise<void> {
        const query = this.options.getString('query') ?? 'everything';
        await this.reply(\`Searching for \${query}\`, { ephemeral: true });
    }
}`;

const TONES: EntityTone[] = ['class', 'interface', 'type', 'function', 'enum', 'variable'];
const CARD_TONES: EntityTone[] = ['class', 'interface', 'type'];

function TextTiers(): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h1 className={cn('font-display text-4xl font-semibold text-(--text)')}>Paginator</h1>
            <p className={cn('max-w-2xl text-lg text-(--text)')}>
                Body copy at full strength. Drives a page-by-page embed with button controls, and re-renders on every
                interaction.
            </p>
            <p className={cn('max-w-2xl text-(--text-muted)')}>
                Muted copy sits one step down and carries the supporting detail, deprecation notes, and parameter
                descriptions.
            </p>
            <p className={cn('max-w-2xl text-(--text-faint)')}>
                Faint copy is the weakest tier, used for breadcrumbs and inline metadata.
            </p>
        </section>
    );
}

async function BackgroundCandidatesPage(): Promise<ReactElement> {
    const code = await renderSeedcord(SNIPPET);

    return (
        <div className={cn('space-y-8')}>
            <BackgroundPicker />

            <TextTiers />

            <section className={cn('flex flex-wrap gap-2')}>
                {TONES.map((tone) => (
                    <span
                        key={tone}
                        className={cn(
                            'rounded-sm border px-2.5 py-1 font-mono text-xs font-semibold',
                            getToneConfig(tone).styles.tag
                        )}
                    >
                        {tone}
                    </span>
                ))}
                <Badge variant="chip" tone="accent">
                    accent chip
                </Badge>
                <Badge variant="chip" tone="danger">
                    deprecated
                </Badge>
            </section>

            <section className={cn('space-y-4')}>
                {CARD_TONES.map((tone) => (
                    <Card key={tone} variant="default">
                        <CardHeader>
                            <CardTitle className={cn(getToneConfig(tone).styles.heading)}>
                                {tone} heading on a card surface
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            <p className={cn('text-(--text-muted)')}>
                                Card body on <code className={cn('font-mono')}>--surface</code> over the page
                                background. Check the border, the surface lift, and the heading tint.
                            </p>
                        </CardBody>
                    </Card>
                ))}
            </section>

            <section className={cn('space-y-2')}>
                <p className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>
                    code block · shiki dark bg is #2d3328
                </p>
                <CodeBlock
                    representation={{ text: SNIPPET, html: code }}
                    label="SearchHandler.ts"
                    copyValue={SNIPPET}
                />
            </section>

            <section className={cn('grid gap-3 sm:grid-cols-3')}>
                <div className={cn('rounded-md border border-(--border) bg-(--bg-surface-subtle) p-4')}>
                    <p className={cn('text-(--text-muted)')}>bg-surface-subtle</p>
                </div>
                <div className={cn('rounded-md border border-(--border) bg-(--bg-surface-moderate) p-4')}>
                    <p className={cn('text-(--text-muted)')}>bg-surface-moderate</p>
                </div>
                <div className={cn('rounded-md border border-(--border) bg-(--bg-navbar) p-4')}>
                    <p className={cn('text-(--text-muted)')}>bg-navbar</p>
                </div>
            </section>

            <section className={cn('h-64 rounded-md border border-(--border) bg-(--command-overlay)/70 p-4')}>
                <p className={cn('text-(--text)')}>command-overlay at 70%, the palette scrim</p>
            </section>
        </div>
    );
}

export default BackgroundCandidatesPage;
