import { ArrowUpRight } from 'lucide-react';

import { formatVersionLabel } from '@lib/docs/version';
import { getToneConfig } from '@lib/entityMetadata';
import Button from '@ui/Button';
import Icon from '@ui/Icon';

import Pill from '../ui/Pill';
import SeeAlso from '../ui/SeeAlso';
import TagPills from '../ui/TagPills';
import CommentExamples from './comments/CommentExamples';
import CommentParagraphs from './comments/CommentParagraphs';
import DeprecatedEntity from './DeprecatedEntity';
import FunctionSignaturesInline from './functions/FunctionSignaturesInline';
import SignatureBlock from './signatures/SignatureBlock';
import { buildSummaryNodes } from './utils/buildSummaryNodes';
import { useActiveSignatureList } from './utils/useActiveSignatureList';

import type { ActiveSignatureListProps } from './utils/useActiveSignatureList';
import type {
    CodeRepresentation,
    CommentExample,
    CommentParagraph,
    FunctionSignatureModel,
    WithDeprecationStatus,
    WithSeeAlso,
    WithThrows
} from '@lib/docs/types';
import type { EntityTone, EntityToneStyle } from '@lib/entityMetadata';
import type { ReactElement } from 'react';

function getHeaderExamples(
    active: FunctionSignatureModel | undefined,
    summaryExamples: readonly CommentExample[] | undefined
): readonly CommentExample[] {
    if (active?.examples.length) return active.examples;
    return summaryExamples ?? [];
}

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
        className="border-border/80 text-subtle h-10 w-10 shrink-0 rounded-xl border transition hover:text-(--text)"
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
    sourceUrl
}: {
    toneStyles: EntityToneStyle;
    toneIcon: React.ComponentType<Record<string, unknown>>;
    badgeLabel: string;
    pkg: string;
    version?: string | null | undefined;
    tags: readonly string[];
    symbolName: string;
    summaryNodes: React.ReactNode;
    sourceUrl?: string | null | undefined;
}): ReactElement {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
                <Pill className={toneStyles.badge}>
                    <Icon icon={toneIcon} size={16} />
                    {badgeLabel}
                </Pill>
                <Pill className="border-border surface-pill text-subtle">{pkg}</Pill>
                {version ? (
                    <Pill className="border-border/80 bg-surface-92 text-subtle">{formatVersionLabel(version)}</Pill>
                ) : null}
                <TagPills tags={tags} />
            </div>

            <div className="flex items-start gap-3 sm:gap-4">
                <div className="min-w-0 flex-1 space-y-2.5">
                    <h1 className="text-2xl font-bold text-(--text) sm:text-3xl lg:text-4xl">{symbolName}</h1>
                    <div className="text-subtle space-y-2 text-sm leading-relaxed">{summaryNodes}</div>
                </div>
                {sourceUrl ? <SourceButton href={sourceUrl} /> : null}
            </div>
        </div>
    );
}

function SignatureArea({
    active,
    fn,
    signature,
    headerExamples
}: {
    active?: FunctionSignatureModel | undefined;
    fn: readonly FunctionSignatureModel[];
    signature: CodeRepresentation;
    headerExamples: readonly CommentExample[];
}): ReactElement {
    return (
        <>
            <SignatureBlock signature={active ? active.code : signature} />

            {fn.length ? (
                <div className="mt-3">
                    <FunctionSignaturesInline signatures={fn} />
                </div>
            ) : null}

            {headerExamples.length ? (
                <div className="mt-3">
                    <CommentExamples examples={headerExamples} />
                </div>
            ) : null}
        </>
    );
}

// eslint-disable-next-line complexity
function EntityHeader({
    badgeLabel,
    pkg,
    signature,
    summary,
    symbolName,
    tone,
    sourceUrl,
    version,
    deprecationStatus = { isDeprecated: false },
    tags = [],
    summaryExamples = [],
    functionSignatures,
    seeAlso,
    throws
}: EntityHeaderProps): ReactElement {
    const toneConfig = getToneConfig(tone);
    const toneStyles = toneConfig.styles;
    const ToneIcon = toneConfig.icon;
    const fn = functionSignatures ?? [];
    const ids = fn.map((s) => ({ id: s.id, anchor: (s as unknown as ActiveSignatureListProps).anchor }));
    const [activeId] = useActiveSignatureList(ids as ActiveSignatureListProps[]);
    const active = fn.find((s) => s.id === activeId) ?? fn[0];

    const headerSummary = active?.summary.length ? active.summary : summary;
    const headerExamples = getHeaderExamples(active, summaryExamples);
    const summaryNodes = buildSummaryNodes(
        headerSummary,
        'Review the generated signature below while we finish migrating full TypeDoc content into the reference UI.'
    );
    const activeIsDeprecated = Boolean(active?.deprecationStatus?.isDeprecated);

    const headerContent = (
        <>
            <HeaderTop
                toneStyles={toneStyles}
                toneIcon={ToneIcon}
                badgeLabel={badgeLabel}
                pkg={pkg}
                version={version}
                tags={tags}
                symbolName={symbolName}
                summaryNodes={summaryNodes}
                sourceUrl={sourceUrl}
            />

            {throws?.length ? (
                <div>
                    <p className="text-subtle flex flex-wrap items-baseline gap-2">
                        <span className="font-semibold text-(--text)">Throws:</span>
                    </p>
                    <CommentParagraphs paragraphs={throws} />
                </div>
            ) : null}

            <SeeAlso entries={seeAlso} />

            {deprecationStatus.isDeprecated ? (
                <SignatureArea active={active} fn={fn} signature={signature} headerExamples={headerExamples} />
            ) : activeIsDeprecated ? (
                <DeprecatedEntity
                    deprecationStatus={
                        active?.deprecationStatus ?? { isDeprecated: true, deprecationMessage: undefined }
                    }
                >
                    <SignatureArea active={active} fn={fn} signature={signature} headerExamples={headerExamples} />
                </DeprecatedEntity>
            ) : (
                <SignatureArea active={active} fn={fn} signature={signature} headerExamples={headerExamples} />
            )}
        </>
    );

    return (
        <header className="min-w-0">
            <DeprecatedEntity deprecationStatus={deprecationStatus}>
                <div className="card bg-surface-96 shadow-soft space-y-4 p-4 sm:p-5">{headerContent}</div>
            </DeprecatedEntity>
        </header>
    );
}

export default EntityHeader;
