import { formatVersionLabel } from '@seedcord/docs-engine/client';
import { Badge, Button, Card, Icon, type IconComponent, cn } from '@seedcord/ui';
import { ArrowUpRight } from 'lucide-react';

import { SeeAlso } from '@components/docs/SeeAlso';
import { TagPills } from '@components/docs/TagPills';
import { getToneConfig } from '@lib/tonePresentation';

import { CommentExamples } from './comments/CommentExamples';
import { CommentParagraphs } from './comments/CommentParagraphs';
import { DeprecatedEntity } from './DeprecatedEntity';
import { FunctionSignaturesInline } from './functions/FunctionSignaturesInline';
import { SignatureBlock } from './signatures/SignatureBlock';
import { buildSummaryNodes } from './utils/buildSummaryNodes';
import { useActiveSignatureList } from './utils/useActiveSignatureList';

import type {
    CodeRepresentation,
    CommentExample,
    CommentParagraph,
    FunctionSignatureModel,
    WithDeprecationStatus,
    WithSeeAlso,
    WithThrows
} from '@lib/docs/types';
import type { EntityToneStyle } from '@lib/tonePresentation';
import type { EntityTone } from '@seedcord/docs-engine/client';
import type { ReactElement } from 'react';

function getHeaderExamples(
    active: FunctionSignatureModel | undefined,
    summaryExamples: readonly CommentExample[] | undefined
): readonly CommentExample[] {
    if (active?.examples.length) return active.examples;
    return summaryExamples ?? [];
}

const EMPTY_TAGS: readonly string[] = [];
const EMPTY_EXAMPLES: readonly CommentExample[] = [];

interface EntityHeaderProps extends WithThrows, WithSeeAlso, WithDeprecationStatus {
    badgeLabel: string;
    pkg: string;
    symbolName: string;
    tone: EntityTone;
    signature: CodeRepresentation;
    functionSignatures?: readonly FunctionSignatureModel[];
    summary: readonly CommentParagraph[];
    summaryExamples?: readonly CommentExample[];
    sourceUrl?: string | null;
    version?: string;
    tags?: readonly string[];
}

const SourceButton = ({ href }: { href: string }): ReactElement => (
    <Button
        asChild
        variant="ghost"
        size="icon"
        className={cn('border-border/80 text-subtle size-10 shrink-0 rounded-xl border transition hover:text-(--text)')}
        aria-label="Open source in a new tab"
    >
        <a href={href} target="_blank" rel="noreferrer noopener">
            <Icon icon={ArrowUpRight} size={18} />
        </a>
    </Button>
);

function HeaderTop({
    toneStyles,
    toneIcon,
    badgeLabel,
    pkg,
    version,
    tags,
    symbolName,
    summaryNodes,
    overloadSelector,
    sourceUrl
}: {
    toneStyles: EntityToneStyle;
    toneIcon: IconComponent;
    badgeLabel: string;
    pkg: string;
    version?: string | null | undefined;
    tags: readonly string[];
    symbolName: string;
    summaryNodes: React.ReactNode;
    overloadSelector: React.ReactNode;
    sourceUrl?: string | null | undefined;
}): ReactElement {
    return (
        <div className={cn('space-y-3')}>
            <div className={cn('flex flex-wrap items-center gap-2.5')}>
                <Badge className={cn(toneStyles.badge)}>
                    <Icon icon={toneIcon} size={14} />
                    {badgeLabel}
                </Badge>
                <Badge tone="accent">{pkg}</Badge>
                {version ? <Badge tone="muted">{formatVersionLabel(version)}</Badge> : null}
                <TagPills tags={tags} />
            </div>

            <div className={cn('flex items-start gap-3 sm:gap-4')}>
                <div className={cn('min-w-0 flex-1 space-y-2.5')}>
                    <h1 className={cn('text-2xl font-semibold text-(--text) sm:text-3xl lg:text-4xl')}>{symbolName}</h1>
                    {overloadSelector}
                    <div className={cn('text-subtle space-y-2 text-sm/relaxed')}>{summaryNodes}</div>
                </div>
                {sourceUrl ? <SourceButton href={sourceUrl} /> : null}
            </div>
        </div>
    );
}

function SignatureArea({
    active,
    signature,
    headerExamples
}: {
    active?: FunctionSignatureModel | undefined;
    signature: CodeRepresentation;
    headerExamples: readonly CommentExample[];
}): ReactElement {
    return (
        <>
            <SignatureBlock signature={active ? active.code : signature} />

            {headerExamples.length ? (
                <div className={cn('mt-3')}>
                    <CommentExamples examples={headerExamples} />
                </div>
            ) : null}
        </>
    );
}

function ThrowsSection({
    headerThrows
}: {
    headerThrows: readonly CommentParagraph[] | undefined;
}): ReactElement | null {
    if (!headerThrows?.length) return null;
    return (
        <div>
            <p className={cn('text-subtle flex flex-wrap items-baseline gap-2')}>
                <span className={cn('font-semibold text-(--text)')}>Throws:</span>
            </p>
            <CommentParagraphs paragraphs={headerThrows} isList />
        </div>
    );
}

interface HeaderBodyProps {
    deprecationStatus: EntityHeaderProps['deprecationStatus'];
    active: FunctionSignatureModel | undefined;
    signature: CodeRepresentation;
    headerExamples: readonly CommentExample[];
}

function HeaderBody({ deprecationStatus, active, signature, headerExamples }: HeaderBodyProps): ReactElement {
    const parentIsDeprecated = Boolean(deprecationStatus?.isDeprecated);
    const activeIsDeprecated = Boolean(active?.deprecationStatus?.isDeprecated);
    const signatureArea = <SignatureArea active={active} signature={signature} headerExamples={headerExamples} />;

    if (parentIsDeprecated || !activeIsDeprecated) return signatureArea;

    return (
        <DeprecatedEntity
            deprecationStatus={active?.deprecationStatus ?? { isDeprecated: true, deprecationMessage: undefined }}
        >
            {signatureArea}
        </DeprecatedEntity>
    );
}

export function EntityHeader({
    badgeLabel,
    pkg,
    signature,
    summary,
    symbolName,
    tone,
    sourceUrl,
    version,
    deprecationStatus = { isDeprecated: false },
    tags = EMPTY_TAGS,
    summaryExamples = EMPTY_EXAMPLES,
    functionSignatures,
    seeAlso,
    throws
}: EntityHeaderProps): ReactElement {
    const toneConfig = getToneConfig(tone);
    const toneStyles = toneConfig.styles;
    const ToneIcon = toneConfig.icon;
    const fn = functionSignatures ?? [];
    const [activeId] = useActiveSignatureList(fn);
    const active = fn.find((s) => s.id === activeId) ?? fn[0];

    const headerSummary = active?.summary.length ? active.summary : summary;
    const headerExamples = getHeaderExamples(active, summaryExamples);
    const headerThrows = active?.throws?.length ? active.throws : throws;
    // Functions carry @see on the signature (entity-level seeAlso is empty), so track the active
    // overload like summary/throws do.
    const headerSeeAlso = active?.seeAlso?.length ? active.seeAlso : seeAlso;
    const summaryNodes = buildSummaryNodes(headerSummary, '');

    return (
        <header className={cn('min-w-0')}>
            <DeprecatedEntity deprecationStatus={deprecationStatus}>
                <Card size="md" className={cn('space-y-4 sm:p-5')}>
                    <HeaderTop
                        toneStyles={toneStyles}
                        toneIcon={ToneIcon}
                        badgeLabel={badgeLabel}
                        pkg={pkg}
                        version={version}
                        tags={tags}
                        symbolName={symbolName}
                        summaryNodes={summaryNodes}
                        overloadSelector={fn.length > 1 ? <FunctionSignaturesInline signatures={fn} /> : null}
                        sourceUrl={sourceUrl}
                    />
                    <ThrowsSection headerThrows={headerThrows} />
                    <SeeAlso entries={headerSeeAlso} />
                    <HeaderBody
                        deprecationStatus={deprecationStatus}
                        active={active}
                        signature={signature}
                        headerExamples={headerExamples}
                    />
                </Card>
            </DeprecatedEntity>
        </header>
    );
}
