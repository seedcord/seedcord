import { APPLE_ICON_SIZE, MaterwelonFavicon } from '@seedcord/ui/MaterwelonFavicon';
import { BRAND } from '@seedcord/ui/palette';
import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const revalidate = false;

export const size = APPLE_ICON_SIZE;
export const contentType = 'image/png';

export default function AppleIcon(): ImageResponse {
    return new ImageResponse(<MaterwelonFavicon ring={BRAND.rind} size={APPLE_ICON_SIZE.width} />, APPLE_ICON_SIZE);
}
