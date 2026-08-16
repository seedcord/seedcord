import { MaterwelonGlyph } from './MaterwelonGlyph';
import { OG } from './og';

import type { ReactElement } from 'react';

export const FAVICON_SIZE = { width: 256, height: 256 } as const;

// 36 read too heavy at every size. 18 still shows at the 16px a browser gives a tab.
const RING_WIDTH = 18;
const CORNER = 56;
const GLYPH_WIDTH = 148;

const INNER_SIZE = FAVICON_SIZE.width - RING_WIDTH * 2;
const INNER_CORNER = CORNER - RING_WIDTH;

interface MaterwelonFaviconProps {
    // the ring colour is what tells one seedcord site from another
    ring: string;
}

// each app renders this through ImageResponse from its icon.tsx
export function MaterwelonFavicon({ ring }: MaterwelonFaviconProps): ReactElement {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: FAVICON_SIZE.width,
                height: FAVICON_SIZE.height,
                backgroundColor: ring,
                borderRadius: CORNER
            }}
        >
            {/* Satori gives a bordered box the same radius inside and out */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: INNER_SIZE,
                    height: INNER_SIZE,
                    backgroundColor: OG.seedDark,
                    borderRadius: INNER_CORNER
                }}
            >
                <MaterwelonGlyph
                    width={GLYPH_WIDTH}
                    fills={{ flesh: OG.flesh, seeds: OG.seedDark, rind: OG.rind, pith: OG.pith }}
                />
            </div>
        </div>
    );
}
