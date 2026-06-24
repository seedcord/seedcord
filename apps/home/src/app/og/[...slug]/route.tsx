import { loadOgFonts, OG_SIZE } from '@seedcord/ui/og';
import { ImageResponse } from 'next/og';

import { OgCard } from '@lib/og/card';
import { OG_SCALE } from '@lib/site';

export const dynamic = 'force-static';
export const revalidate = false;

// need this so that the static export emits a real `.png` file
// instead of an extension-less file with the wrong content-type
export function generateStaticParams(): { slug: string[] }[] {
    return [{ slug: ['image.png'] }];
}

export function GET(): ImageResponse {
    return new ImageResponse(
        <div style={{ display: 'flex', width: OG_SIZE.width * OG_SCALE, height: OG_SIZE.height * OG_SCALE }}>
            <div style={{ display: 'flex', transformOrigin: 'top left', transform: `scale(${OG_SCALE})` }}>
                <OgCard />
            </div>
        </div>,
        { width: OG_SIZE.width * OG_SCALE, height: OG_SIZE.height * OG_SCALE, fonts: loadOgFonts() }
    );
}
