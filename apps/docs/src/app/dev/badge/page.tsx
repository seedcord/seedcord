import { Badge, Icon, type BadgeTone, type BadgeVariant, cn } from '@seedcord/ui';
import { Braces, FunctionSquare, Puzzle, SquareStack } from 'lucide-react';

import type { ReactElement, ReactNode } from 'react';

const VARIANTS = ['status', 'chip'] as const satisfies readonly BadgeVariant[];
const TONES = ['neutral', 'accent', 'danger', 'muted'] as const satisfies readonly BadgeTone[];

function DevSection({ title, children }: { title: string; children: ReactNode }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

function VariantToneMatrix(): ReactElement {
    return (
        <div className={cn('space-y-4')}>
            {VARIANTS.map((variant) => (
                <div key={variant} className={cn('space-y-2')}>
                    <div className={cn('text-subtle text-xs font-medium tracking-wide')}>variant={variant}</div>
                    <div className={cn('flex flex-wrap items-center gap-3')}>
                        {TONES.map((tone) => (
                            <Badge key={tone} variant={variant} tone={tone}>
                                {tone}
                            </Badge>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function WithIconRow(): ReactElement {
    return (
        <div className={cn('flex flex-wrap items-center gap-3')}>
            <Badge tone="accent">
                <Icon icon={SquareStack} size={14} />
                Class
            </Badge>
            <Badge tone="accent">
                <Icon icon={Puzzle} size={14} />
                Interface
            </Badge>
            <Badge tone="accent">
                <Icon icon={Braces} size={14} />
                Type
            </Badge>
            <Badge tone="accent">
                <Icon icon={FunctionSquare} size={14} />
                Function
            </Badge>
        </div>
    );
}

function EntityHeaderMock(): ReactElement {
    return (
        <div className={cn('space-y-2')}>
            <p className={cn('text-subtle text-xs')}>
                Real-world cluster from `EntityHeader`: entity-tone badge with icon, package, version chip, internal
                tag. All four Pill sites migrated to Badge in the same commit.
            </p>
            <div className={cn('flex flex-wrap items-center gap-2.5')}>
                <Badge
                    className={cn(
                        'border-(--tone-class-badge-border) bg-(--tone-class-badge-bg) text-(--entity-class)'
                    )}
                >
                    <Icon icon={SquareStack} size={14} />
                    Class
                </Badge>
                <Badge tone="accent">seedcord</Badge>
                <Badge tone="muted">v0.10.6</Badge>
                <Badge tone="muted">Internal</Badge>
                <Badge tone="muted">Decorator</Badge>
            </div>
        </div>
    );
}

function ChipUsageRow(): ReactElement {
    return (
        <div className={cn('space-y-2')}>
            <p className={cn('text-subtle text-xs')}>
                variant=&quot;chip&quot;: non-uppercase, sentence-case, for inline category/labels.
            </p>
            <div className={cn('flex flex-wrap items-center gap-3')}>
                <Badge variant="chip" tone="neutral">
                    typedoc
                </Badge>
                <Badge variant="chip" tone="accent">
                    public
                </Badge>
                <Badge variant="chip" tone="danger">
                    deprecated
                </Badge>
                <Badge variant="chip" tone="muted">
                    optional
                </Badge>
            </div>
        </div>
    );
}

function BadgePage(): ReactElement {
    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Badge</h1>
                <p className={cn('text-subtle text-sm')}>
                    Flat span wrapper. Variants: status (uppercase, smaller text, tracking-wider) + chip (sentence-case,
                    medium weight). Tones: neutral / accent (welon-b) / danger (mater-a) / muted (resource-r). Tokens
                    consumed from `@seedcord/ui/lib/tokens`. Caller passes className to override tone (e.g. EntityHeader
                    uses the per-tone --tone-class-* tokens via className).
                </p>
            </header>
            <DevSection title="Variant × tone matrix">
                <VariantToneMatrix />
            </DevSection>
            <DevSection title="With icon (compose Icon child, any tone)">
                <WithIconRow />
            </DevSection>
            <DevSection title="EntityHeader cluster (real-world consumer)">
                <EntityHeaderMock />
            </DevSection>
            <DevSection title="Chip variant: inline labels">
                <ChipUsageRow />
            </DevSection>
        </div>
    );
}

export default BadgePage;
