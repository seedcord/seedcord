import { MaterwelonGlyph } from './MaterwelonGlyph';
import { GLYPH_SIZE, OG_SIZE } from './og';
import { BRAND } from './palette';

import type { CSSProperties, ReactElement, ReactNode } from 'react';

const INSET = 48;
const RADIUS = 4;
const DROP = 10;

const BORDER = `3px solid ${BRAND.seedDark}`;

const panelBase: CSSProperties = {
    position: 'absolute',
    left: INSET,
    top: INSET,
    width: OG_SIZE.width - INSET * 2,
    height: OG_SIZE.height - INSET * 2,
    borderRadius: RADIUS
};

// Satori has no drop-shadow filter
export function OgMark({ width, offset }: { width: number; offset: number }): ReactElement {
    const ink = BRAND.seedDark;
    const height = (width * GLYPH_SIZE.height) / GLYPH_SIZE.width;

    return (
        <div style={{ position: 'relative', display: 'flex', flexShrink: 0, width, height }}>
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: 'flex',
                    transform: `translate(${offset}px, ${offset}px)`
                }}
            >
                <MaterwelonGlyph
                    width={width}
                    fills={{ flesh: ink, seeds: ink, rind: ink, pith: ink }}
                    style={{ opacity: 0.85 }}
                />
            </div>
            <MaterwelonGlyph
                width={width}
                fills={{ flesh: BRAND.flesh, seeds: BRAND.seedDark, rind: BRAND.rind, pith: BRAND.pith }}
            />
        </div>
    );
}

const badgeBase: CSSProperties = {
    display: 'flex',
    fontFamily: 'JetBrains Mono',
    fontSize: 22,
    letterSpacing: 1,
    textTransform: 'uppercase',
    borderRadius: 6
};

function Pill({ label, accent }: { label: string; accent: string }): ReactElement {
    return <div style={{ ...badgeBase, color: BRAND.pith, backgroundColor: accent, padding: '6px 15px' }}>{label}</div>;
}

function Badge({ label }: { label: string }): ReactElement {
    return (
        <div style={{ ...badgeBase, color: BRAND.sub, border: '2px solid rgba(45,51,40,0.28)', padding: '5px 14px' }}>
            {label}
        </div>
    );
}

function PageFooter({ domain }: { domain: string }): ReactElement {
    return (
        <OgFooter height={84} paddingX={46}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <OgMark width={40} offset={2} />
                <div
                    style={{
                        display: 'flex',
                        fontFamily: 'Space Grotesk',
                        fontWeight: 600,
                        fontSize: 31,
                        letterSpacing: -1.2,
                        color: BRAND.seedDark
                    }}
                >
                    seedcord
                </div>
            </div>
            <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20, color: BRAND.seedDark }}>
                {domain}
            </div>
        </OgFooter>
    );
}

interface NameStep {
    fontSize: number;
    descLines: number;
}

// the description drops a row once the name wraps to a second line
const NAME_STEPS = [
    { upTo: 18, fontSize: 72, descLines: 5 },
    { upTo: 24, fontSize: 60, descLines: 5 }
];
const LONGEST_NAME: NameStep = { fontSize: 50, descLines: 4 };

function nameStep(name: string): NameStep {
    return NAME_STEPS.find((step) => name.length <= step.upTo) ?? LONGEST_NAME;
}

function PageBody({ pill, accent, meta, name, description }: OgPageCardProps): ReactElement {
    const { fontSize, descLines } = nameStep(name);
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '38px 48px',
                gap: 24,
                justifyContent: 'center'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Pill label={pill} accent={accent} />
                {meta.map((m) => (
                    <Badge key={m} label={m} />
                ))}
            </div>
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    fontFamily: 'Space Grotesk',
                    fontWeight: 600,
                    fontSize,
                    letterSpacing: -2,
                    lineHeight: 1.02,
                    color: accent
                }}
            >
                {name}
            </div>
            <div
                style={{
                    display: 'block',
                    maxWidth: 980,
                    fontFamily: 'Hanken Grotesk',
                    fontSize: 32,
                    lineHeight: 1.4,
                    color: BRAND.sub,
                    lineClamp: descLines
                }}
            >
                {description}
            </div>
        </div>
    );
}

export interface OgPageCardProps {
    pill: string;
    accent: string;
    meta: readonly string[];
    name: string;
    description: string;
    domain: string;
}

export function OgPageCard(props: OgPageCardProps): ReactElement {
    return (
        <OgFrame>
            <PageBody {...props} />
            <PageFooter domain={props.domain} />
        </OgFrame>
    );
}

export function OgFooter({
    height,
    paddingX,
    children
}: {
    height: number;
    paddingX: number;
    children: ReactNode;
}): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height,
                padding: `0 ${paddingX}px`,
                borderTop: BORDER
            }}
        >
            {children}
        </div>
    );
}

// every seedcord og card draws this frame, the body and footer come from the app
export function OgFrame({ children }: { children: ReactNode }): ReactElement {
    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                width: OG_SIZE.width,
                height: OG_SIZE.height,
                backgroundColor: BRAND.pith
            }}
        >
            <div
                style={{
                    ...panelBase,
                    backgroundColor: BRAND.seedDark,
                    transform: `translate(${DROP}px, ${DROP}px)`
                }}
            />
            <div
                style={{
                    ...panelBase,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: BRAND.pith,
                    border: BORDER
                }}
            >
                {children}
            </div>
        </div>
    );
}
