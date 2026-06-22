import { CodeBlock, cn } from '@seedcord/ui';

import { FUNCTION_HUES, PALETTE, renderHue, renderProposed, type PaletteRole } from './proposedTheme';

import type { CSSProperties, ReactElement } from 'react';

const HUE_SAMPLE = `@Gated(GuildOnly())
@SlashRoute('library/search')
export class SearchHandler extends SlashHandler<'library/search'> {
    public async execute(): Promise<void> {
        const query = this.options.getString('query');
        await this.event.reply(\`Searching for \${query}\`);
    }
}`;

const JSDOC_SAMPLE = `/**
 * Resolves the emoji by name.
 * @param name - the emoji key
 * @returns the resolved emoji, or null when missing
 */
function resolveEmoji(name: string): Emoji | null {
    return registry.get(name) ?? null;
}`;

const SIGNATURE_SAMPLE = `abstract class AutocompleteHandler<
    Route extends keyof SlashOptionRegistry,
    Cache extends CacheType = 'cached'
>
    extends BaseHandler<AutocompleteInteraction<Cache>>
    implements Handler {}`;

const MEMBER_SAMPLE = `class Example {
    handle(): void {
        this.match({ a: () => {} });
        const opts = this.options;
        const fired = this.route;
    }
}`;

function emphasisStyle(role: PaletteRole): CSSProperties {
    return {
        fontWeight: role.emphasis === 'bold' ? 'bold' : 'normal',
        fontStyle: role.emphasis === 'italic' ? 'italic' : 'normal'
    };
}

function Chip({ role, mode }: { role: PaletteRole; mode: 'dark' | 'light' }): ReactElement {
    const bg = mode === 'dark' ? '#2d3328' : '#f4f1e3';
    const hex = mode === 'dark' ? role.dark : role.light;
    const hexMuted = mode === 'dark' ? 'rgba(248,246,232,0.45)' : 'rgba(45,51,40,0.5)';
    return (
        <div className={cn('rounded-md px-4 py-3')} style={{ backgroundColor: bg }}>
            <span className={cn('font-mono text-sm')} style={{ color: hex, ...emphasisStyle(role) }}>
                {role.sample}
            </span>
            <div className={cn('mt-1.5 font-mono text-[11px]')} style={{ color: hexMuted }}>
                {hex}
            </div>
        </div>
    );
}

function SwatchGrid(): ReactElement {
    return (
        <section className={cn('space-y-2')}>
            <div className={cn('grid grid-cols-[15rem_1fr_1fr] gap-3 px-1')}>
                <span className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>role</span>
                <span className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>dark</span>
                <span className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>light</span>
            </div>
            {PALETTE.map((role) => (
                <div key={role.key} className={cn('grid grid-cols-[15rem_1fr_1fr] items-center gap-3')}>
                    <div>
                        <p className={cn('text-sm font-medium text-(--text)')}>{role.label}</p>
                        <p className={cn('text-subtle font-mono text-xs')}>
                            {role.colorName}
                            {role.emphasis ? ` · ${role.emphasis}` : ''}
                        </p>
                    </div>
                    <Chip role={role} mode="dark" />
                    <Chip role={role} mode="light" />
                </div>
            ))}
        </section>
    );
}

async function CodePalettePage(): Promise<ReactElement> {
    const hueRenders = await Promise.all(
        FUNCTION_HUES.map(async (hue) => ({ hue, html: await renderHue(HUE_SAMPLE, hue.key) }))
    );
    const jsdocHtml = await renderProposed(JSDOC_SAMPLE);
    const signatureHtml = await renderHue(SIGNATURE_SAMPLE, 'coral');
    const memberHtml = await renderHue(MEMBER_SAMPLE, 'coral');

    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Proposed code palette</h1>
                <p className={cn('text-subtle text-sm')}>
                    The full warm palette, named, dark + light side by side. The decorator <code>@</code> is now clay
                    (muted) so it recedes behind the decorator name. Nothing is applied to the real theme yet. Toggle
                    the docs theme to see the applied samples in both modes.
                </p>
            </header>

            <SwatchGrid />

            <section className={cn('space-y-6')}>
                <div className={cn('space-y-1')}>
                    <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>
                        Function / decorator hue — pick one
                    </h2>
                    <p className={cn('text-subtle text-sm')}>
                        Functions and decorator names share one hue (separated by italic vs bold). Same snippet, three
                        warm candidates. The <code>@</code> stays clay (muted) in all three.
                    </p>
                </div>
                {hueRenders.map(({ hue, html }) => (
                    <CodeBlock
                        key={hue.key}
                        representation={{ text: HUE_SAMPLE, html }}
                        label={hue.label}
                        copyValue={null}
                    />
                ))}
            </section>

            <section className={cn('space-y-3')}>
                <div className={cn('space-y-1')}>
                    <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>
                        Dense generics + member access (coral)
                    </h2>
                    <p className={cn('text-subtle text-sm')}>
                        Types render italic now, not bold (bold is reserved for decorator names). Type params and
                        concrete types share a scope, so they are one wheat. Properties (<code>this.options</code>,{' '}
                        <code>this.route</code>) are tan, only calls (<code>this.match</code>) are coral.
                    </p>
                </div>
                <CodeBlock
                    representation={{ text: SIGNATURE_SAMPLE, html: signatureHtml }}
                    label="dense generic signature"
                    copyValue={null}
                />
                <CodeBlock
                    representation={{ text: MEMBER_SAMPLE, html: memberHtml }}
                    label="member access"
                    copyValue={null}
                />
            </section>

            <section className={cn('space-y-2')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>
                    Decorator @ does not leak into JSDoc @
                </h2>
                <p className={cn('text-subtle text-sm')}>
                    The <code>@</code> color is scoped to decorators only. JSDoc <code>@param</code> /{' '}
                    <code>@returns</code> stay sage (comment).
                </p>
                <CodeBlock representation={{ text: JSDOC_SAMPLE, html: jsdocHtml }} copyValue={null} />
            </section>
        </div>
    );
}

export default CodePalettePage;
