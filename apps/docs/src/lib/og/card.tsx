/* eslint-disable no-magic-numbers -- OG card layout, the pixel and typography values are intrinsic to the 1200x630 Satori canvas */
import { MaterwelonGlyph } from '@seedcord/ui/MaterwelonGlyph';
import { GLYPH_SIZE, OG_SIZE } from '@seedcord/ui/og';
import { BRAND } from '@seedcord/ui/palette';

import type { CSSProperties, ReactElement } from 'react';

const PANEL_W = OG_SIZE.width - 96;
const PANEL_H = OG_SIZE.height - 96;

export interface DocOgCardProps {
    pill: string;
    accent: string;
    meta: readonly string[];
    name: string;
    description: string;
}

// a seed-dark copy offset behind the glyph fakes the hard drop-shadow (Satori has no filter)
function Mark({ width }: { width: number }): ReactElement {
    const ink = BRAND.seedDark;
    const height = (width * GLYPH_SIZE.height) / GLYPH_SIZE.width;
    const off = Math.max(2, Math.round(width * 0.06));
    return (
        <div style={{ position: 'relative', display: 'flex', flexShrink: 0, width, height }}>
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: 'flex',
                    transform: `translate(${off}px, ${off}px)`
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

function Footer(): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 84,
                padding: '0 46px',
                borderTop: `3px solid ${BRAND.seedDark}`
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Mark width={40} />
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
                docs.seedcord.org
            </div>
        </div>
    );
}

function CardBody({ pill, accent, meta, name, description }: DocOgCardProps): ReactElement {
    const nameSize = name.length > 24 ? 50 : name.length > 18 ? 60 : 72;
    // a long name can wrap to a second line and eat vertical room
    const descLines = name.length > 24 ? 4 : 5;
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
                    fontSize: nameSize,
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

// no code block here, so a long signature can't overflow the layout
export function DocOgCard(props: DocOgCardProps): ReactElement {
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
                    position: 'absolute',
                    left: 48,
                    top: 48,
                    width: PANEL_W,
                    height: PANEL_H,
                    backgroundColor: BRAND.seedDark,
                    borderRadius: 4,
                    transform: 'translate(10px, 10px)'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    left: 48,
                    top: 48,
                    width: PANEL_W,
                    height: PANEL_H,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: BRAND.pith,
                    border: `3px solid ${BRAND.seedDark}`,
                    borderRadius: 4
                }}
            >
                <CardBody {...props} />
                <Footer />
            </div>
        </div>
    );
}
