import { APPLE_ICON_SIZE, MaterwelonFavicon } from '@seedcord/ui/MaterwelonFavicon';
import { BRAND } from '@seedcord/ui/palette';
import { ImageResponse } from 'takumi-js/response';

export const dynamic = 'force-static';

export function GET(): ImageResponse {
    return new ImageResponse(<MaterwelonFavicon ring={BRAND.rind} size={APPLE_ICON_SIZE.width} />, APPLE_ICON_SIZE);
}
