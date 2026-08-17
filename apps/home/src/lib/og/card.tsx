import { OgFooter, OgFrame, OgMark } from '@seedcord/ui/OgCard';
import { BRAND } from '@seedcord/ui/palette';

import type { ReactElement } from 'react';

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
                color: BRAND.seedDark
            }}
        >
            <div style={{ display: 'flex' }}>The whole Discord bot,</div>
            <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
                <span style={{ color: BRAND.rindDeep }}>wired</span>
                <span>and</span>
                <div style={{ display: 'flex' }}>
                    <span style={{ color: BRAND.fleshDeep }}>typed</span>
                    <span>.</span>
                </div>
            </div>
        </div>
    );
}

function Footer(): ReactElement {
    return (
        <OgFooter height={104} paddingX={56}>
            <div
                style={{
                    display: 'flex',
                    fontFamily: 'Space Grotesk',
                    fontWeight: 600,
                    fontSize: 40,
                    letterSpacing: -1.2,
                    color: BRAND.seedDark
                }}
            >
                seedcord
            </div>
            <div
                style={{
                    display: 'flex',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 23,
                    backgroundColor: BRAND.seedDark,
                    color: BRAND.pith,
                    padding: '13px 22px',
                    borderRadius: 4
                }}
            >
                pnpm create seedcord
            </div>
            <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 23, color: BRAND.seedDark }}>
                seedcord.org
            </div>
        </OgFooter>
    );
}

export function OgCard(): ReactElement {
    return (
        <OgFrame>
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
                <OgMark width={146} offset={5} />
                <Headline />
                <div
                    style={{
                        display: 'flex',
                        textAlign: 'center',
                        maxWidth: 840,
                        fontFamily: 'Hanken Grotesk',
                        fontSize: 25,
                        lineHeight: 1.34,
                        color: BRAND.sub
                    }}
                >
                    Generated option types, a typed customId codec, composable gates, and hot reload, on top of
                    discord.js.
                </div>
            </div>
            <Footer />
        </OgFrame>
    );
}
