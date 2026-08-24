import { MaterwelonGlyph } from './MaterwelonGlyph';
import { BRAND } from './palette';

import type { ReactElement } from 'react';

export const FAVICON_SIZE = { width: 256, height: 256 } as const;
export const APPLE_ICON_SIZE = { width: 180, height: 180 } as const;

// 36 read too heavy at every size. 18 still shows at the 16px a browser gives a tab.
const RING_WIDTH = 18;
const CORNER = 56;
const GLYPH_WIDTH = 148;

interface MaterwelonFaviconProps {
    // the ring colour is what tells one seedcord site from another
    ring: string;
    size?: number;
}

// each app renders this through ImageResponse from its icon.tsx
export function MaterwelonFavicon({ ring, size = FAVICON_SIZE.width }: MaterwelonFaviconProps): ReactElement {
    const scale = size / FAVICON_SIZE.width;
    const ringWidth = RING_WIDTH * scale;
    const corner = CORNER * scale;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                backgroundColor: ring,
                borderRadius: corner
            }}
        >
            {/* Satori gives a bordered box the same radius inside and out */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: size - ringWidth * 2,
                    height: size - ringWidth * 2,
                    backgroundColor: BRAND.seedDark,
                    borderRadius: corner - ringWidth
                }}
            >
                <MaterwelonGlyph
                    width={GLYPH_WIDTH * scale}
                    fills={{ flesh: BRAND.flesh, seeds: BRAND.seedDark, rind: BRAND.rind, pith: BRAND.pith }}
                />
            </div>
        </div>
    );
}
