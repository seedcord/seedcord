import { BRAND_COLORS } from '@seedcord/brand';
import { FAVICON_SIZE, MaterwelonFavicon } from '@seedcord/ui/MaterwelonFavicon';
import { ImageResponse } from 'takumi-js/response';

export const dynamic = 'force-static';
export const revalidate = false;

export const size = FAVICON_SIZE;
export const contentType = 'image/png';

export default function Icon(): ImageResponse {
    return new ImageResponse(<MaterwelonFavicon ring={BRAND_COLORS.pith} />, FAVICON_SIZE);
}
