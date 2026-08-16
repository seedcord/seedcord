import { FAVICON_SIZE, MaterwelonFavicon } from '@seedcord/ui/MaterwelonFavicon';
import { BRAND } from '@seedcord/ui/palette';
import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const revalidate = false;

export const size = FAVICON_SIZE;
export const contentType = 'image/png';

export default function Icon(): ImageResponse {
    return new ImageResponse(<MaterwelonFavicon ring={BRAND.pith} />, FAVICON_SIZE);
}
