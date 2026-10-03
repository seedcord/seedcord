import { FAVICON_SIZE, MaterwelonFavicon } from '@seedcord/ui/MaterwelonFavicon';
import { BRAND } from '@seedcord/ui/palette';
import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export function GET(): ImageResponse {
    return new ImageResponse(<MaterwelonFavicon ring={BRAND.rind} />, FAVICON_SIZE);
}
