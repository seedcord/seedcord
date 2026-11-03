import { BRAND_COLORS } from '@seedcord/brand';
import { FAVICON_SIZE, MaterwelonFavicon } from '@seedcord/ui/MaterwelonFavicon';
import { ImageResponse } from 'takumi-js/response';

export const dynamic = 'force-static';

export function GET(): ImageResponse {
    return new ImageResponse(<MaterwelonFavicon ring={BRAND_COLORS.rind} />, FAVICON_SIZE);
}
