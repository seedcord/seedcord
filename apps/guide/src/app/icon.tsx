import { FAVICON_SIZE, MaterwelonFavicon } from '@seedcord/ui/MaterwelonFavicon';
import { OG } from '@seedcord/ui/og';
import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const revalidate = false;

export const size = FAVICON_SIZE;
export const contentType = 'image/png';

export default function Icon(): ImageResponse {
    return new ImageResponse(<MaterwelonFavicon ring={OG.rind} />, FAVICON_SIZE);
}
