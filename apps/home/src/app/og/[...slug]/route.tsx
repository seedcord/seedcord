import { loadOgFonts, OG_SIZE } from '@seedcord/ui/og';
import { ImageResponse } from 'next/og';

import { OgCard } from '@lib/og/card';

export const dynamic = 'force-static';

// need this so that the static export emits a real `.png` file
// instead of an extension-less file with the wrong content-type
export function generateStaticParams(): { slug: string[] }[] {
    return [{ slug: ['image.png'] }];
}

const SCALE = 3;

export function GET(): ImageResponse {
    return new ImageResponse(
        <div style={{ display: 'flex', width: OG_SIZE.width * SCALE, height: OG_SIZE.height * SCALE }}>
            <div style={{ display: 'flex', transformOrigin: 'top left', transform: `scale(${SCALE})` }}>
                <OgCard />
            </div>
        </div>,
        { width: OG_SIZE.width * SCALE, height: OG_SIZE.height * SCALE, fonts: loadOgFonts() }
    );
}
