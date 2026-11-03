import { BRAND_COLORS } from '@seedcord/brand';
import { OgFooter, OgFrame, OgMark } from '@seedcord/ui/OgCard';
import { SUB_TEXT } from '@seedcord/ui/palette';

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
                color: BRAND_COLORS.seedDark
            }}
        >
            <div style={{ display: 'flex' }}>The whole Discord bot,</div>
            <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
                <span style={{ color: BRAND_COLORS.rindDeep }}>typed</span>
                <div style={{ display: 'flex' }}>
                    <span style={{ color: BRAND_COLORS.fleshDeep }}>end to end</span>
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
                    color: BRAND_COLORS.seedDark
                }}
            >
                seedcord
            </div>
            <div
                style={{
                    display: 'flex',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 23,
                    backgroundColor: BRAND_COLORS.seedDark,
                    color: BRAND_COLORS.pith,
                    padding: '13px 22px',
                    borderRadius: 4
                }}
            >
                pnpm create seedcord
            </div>
            <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 23, color: BRAND_COLORS.seedDark }}>
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
                        flexDirection: 'column',
                        alignItems: 'center',
                        fontFamily: 'Hanken Grotesk',
                        fontSize: 25,
                        lineHeight: 1.34,
                        color: SUB_TEXT
                    }}
                >
                    <div style={{ display: 'flex' }}>
                        Generated slash-option types, typed customIds, reusable checks,
                    </div>
                    <div style={{ display: 'flex' }}>hot reload, and a lot more.</div>
                </div>
            </div>
            <Footer />
        </OgFrame>
    );
}
