import { MaterwelonGlyph } from '@seedcord/ui/MaterwelonGlyph';
import { GLYPH_SIZE, OG, OG_SIZE } from '@seedcord/ui/og';

import type { ReactElement } from 'react';

// a seed-dark copy offset behind the glyph fakes the hard drop-shadow (Satori has no filter)
function GlyphShadow({ width }: { width: number }): ReactElement {
    const ink = OG.seedDark;
    return (
        <MaterwelonGlyph
            width={width}
            fills={{ flesh: ink, seeds: ink, rind: ink, pith: ink }}
            style={{ opacity: 0.85 }}
        />
    );
}

function Mark(): ReactElement {
    const width = 146;
    const height = (width * GLYPH_SIZE.height) / GLYPH_SIZE.width;
    return (
        <div style={{ position: 'relative', display: 'flex', width, height }}>
            <div style={{ position: 'absolute', top: 0, left: 0, display: 'flex', transform: 'translate(5px, 5px)' }}>
                <GlyphShadow width={width} />
            </div>
            <MaterwelonGlyph
                width={width}
                fills={{ flesh: OG.flesh, seeds: OG.seedDark, rind: OG.rind, pith: OG.pith }}
            />
        </div>
    );
}

function Headline(): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                fontFamily: 'Space Grotesk',
                fontWeight: 600,
                fontSize: 56,
                lineHeight: 1,
                letterSpacing: -1.7,
                color: OG.seedDark
            }}
        >
            <div style={{ display: 'flex' }}>The whole Discord bot,</div>
            <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
                <span style={{ color: OG.vineDeep }}>wired</span>
                <span>and</span>
                <div style={{ display: 'flex' }}>
                    <span style={{ color: OG.fleshDeep }}>typed</span>
                    <span>.</span>
                </div>
            </div>
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
                height: 104,
                padding: '0 56px',
                borderTop: `3px solid ${OG.seedDark}`
            }}
        >
            <div
                style={{
                    display: 'flex',
                    fontFamily: 'Space Grotesk',
                    fontWeight: 600,
                    fontSize: 40,
                    letterSpacing: -1.2,
                    color: OG.seedDark
                }}
            >
                seedcord
            </div>
            <div
                style={{
                    display: 'flex',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 23,
                    backgroundColor: OG.seedDark,
                    color: OG.pith,
                    padding: '13px 22px',
                    borderRadius: 4
                }}
            >
                pnpm add seedcord
            </div>
            <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 23, color: OG.seedDark }}>
                seedcord.org
            </div>
        </div>
    );
}

export function OgCard(): ReactElement {
    return (
        <div
            style={{
                position: 'relative',
                display: 'flex',
                width: OG_SIZE.width,
                height: OG_SIZE.height,
                backgroundColor: OG.pith
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: 48,
                    top: 48,
                    width: 1104,
                    height: 534,
                    backgroundColor: OG.seedDark,
                    borderRadius: 4,
                    transform: 'translate(10px, 10px)'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    left: 48,
                    top: 48,
                    width: 1104,
                    height: 534,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: OG.pith,
                    border: `3px solid ${OG.seedDark}`,
                    borderRadius: 4
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '30px 64px',
                        gap: 26
                    }}
                >
                    <Mark />
                    <Headline />
                    <div
                        style={{
                            display: 'flex',
                            textAlign: 'center',
                            maxWidth: 840,
                            fontFamily: 'Hanken Grotesk',
                            fontSize: 25,
                            lineHeight: 1.34,
                            color: OG.sub
                        }}
                    >
                        Generated option types, a typed customId codec, composable gates, and hot reload, on top of
                        discord.js.
                    </div>
                </div>
                <Footer />
            </div>
        </div>
    );
}
