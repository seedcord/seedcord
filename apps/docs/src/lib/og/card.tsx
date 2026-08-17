/* eslint-disable no-magic-numbers -- OG card layout, the pixel and typography values are intrinsic to the 1200x630 Satori canvas */
import { OgFooter, OgFrame, OgMark } from '@seedcord/ui/OgCard';
import { BRAND } from '@seedcord/ui/palette';

import type { CSSProperties, ReactElement } from 'react';

export interface DocOgCardProps {
    pill: string;
    accent: string;
    meta: readonly string[];
    name: string;
    description: string;
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
                docs.seedcord.org
            </div>
        </OgFooter>
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
        <OgFrame>
            <CardBody {...props} />
            <Footer />
        </OgFrame>
    );
}
